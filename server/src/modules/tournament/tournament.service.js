/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournament.service.js
 * Purpose : Tournament Service
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Tournament = require("./tournament.model");
const TournamentGroup = require("./tournamentGroup.model");
const TournamentTeam = require("./tournamentTeam.model");
const TournamentMatch = require("./tournamentMatch.model");
const Playground = require("../playground/playground.model");
const User = require("../user/user.model");
const Payment = require("../payment/payment.model");
const Slot = require("../slot/slot.model");
const { randomInt } = require("crypto");
const { createNotification } = require("../notification/notification.service");
const { emitDashboardUpdate, emitToUser } = require("../../config/socket");
const { calendarDate, dateOnlyParts, dayRange, tournamentRegistrationClosesAt, zonedDateTime } = require("../../utils/scheduleTime");

const tournamentNameKey = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const dateRangeFor = (value) => {
    const date = new Date(value);
    return {
        start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
        end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)),
    };
};

const officialDrawTime = (startDate) => {
    const start = dateOnlyParts(startDate);
    const drawDay = new Date(Date.UTC(start.year, start.month - 1, start.day - 1));
    return zonedDateTime({ year: drawDay.getUTCFullYear(), month: drawDay.getUTCMonth() + 1, day: drawDay.getUTCDate() }, "18:00");
};

// The server owns the timing, so every registered team sees one official,
// synchronised result rather than a browser-only shuffle.
const DRAW_REVEAL_INTERVAL_MS = 2400;
const activeDrawTimers = new Map();

// ===================================================
// Create Tournament
// ===================================================

const createTournament = async (payload, createdBy) => {
    const rules = payload.matchRules || {};
    const sportRuleIsValid = (payload.sportType === "Cricket" && Number.isInteger(rules.cricketOvers) && rules.cricketOvers >= 1 && rules.cricketOvers <= 50)
        || (payload.sportType === "Football" && Number.isInteger(rules.footballDurationMinutes) && rules.footballDurationMinutes >= 30 && rules.footballDurationMinutes <= 120)
        || (payload.sportType === "Badminton" && Number.isInteger(rules.badmintonPointsToWin) && rules.badmintonPointsToWin >= 1 && rules.badmintonPointsToWin <= 30);
    if (!sportRuleIsValid) {
        throw new Error("Choose a valid match rule for the selected sport.");
    }
    if (payload.sportType === "Badminton" && (payload.playingMembers > 2 || payload.extraMembers > 0)) {
        throw new Error("Badminton teams can have only 1 player (singles) or 2 players (doubles), with no extra players.");
    }
    const playground = await Playground.findOne({
        _id: payload.playground,
        isDeleted: false,
        isApproved: true,
        status: "Active",
    });

    if (!playground) {
        throw new Error("Choose one active, approved playground for this tournament.");
    }
    if (playground.sportType !== payload.sportType) {
        throw new Error(`${playground.name} is a ${playground.sportType} playground. Create a ${playground.sportType} tournament for this venue.`);
    }

    const creator = await User.findById(createdBy).select("role");
    if (!creator) throw new Error("Tournament creator not found.");
    if (creator.role === "playground-admin" && playground.playgroundAdmin.toString() !== String(createdBy)) {
        throw new Error("Playground admins can create tournaments only for their own playground.");
    }

    const nameKey = tournamentNameKey(payload.name);
    const eventDay = dateRangeFor(payload.startDate);
    const duplicate = await Tournament.findOne({
        playground: playground._id,
        startDate: { $gte: eventDay.start, $lt: eventDay.end },
        isDeleted: false,
        $or: [
            { nameKey },
            { name: { $regex: `^${String(payload.name).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        ],
    }).select("name startDate");
    if (duplicate) {
        throw new Error(`Duplicate tournament detected: \"${duplicate.name}\" already uses this playground on the selected start date. Keep the existing event, or change the tournament name, venue, or start date.`);
    }

    const totalTeams = payload.totalTeams;
    const groupCount = payload.groupCount || 2;

    if (totalTeams % groupCount !== 0) {
        throw new Error(`Total teams must be divisible by group count (${groupCount}).`);
    }

    const teamsPerGroup = Math.floor(totalTeams / groupCount);
    if (teamsPerGroup < 2 || teamsPerGroup > 8) {
        throw new Error("International group play requires 2 to 8 teams in each group.");
    }
    if (![2, 4].includes(groupCount)) {
        throw new Error("Professional tournament fixtures currently support two or four groups so every knockout pairing can be scheduled accurately.");
    }

    // One approved venue has three protected match windows each day. Reserve
    // enough calendar days for every group match plus the full knockout route:
    // 4 groups need QF (2 days), SF (1) and final day (1); 2 groups need SF
    // and final day. Football's third-place match shares the final-day window.
    const groupFixtures = groupCount * ((teamsPerGroup * (teamsPerGroup - 1)) / 2);
    const groupDays = Math.ceil(groupFixtures / 3);
    const knockoutDays = groupCount === 4 ? 4 : 2;
    const requiredFixtureDays = groupDays + knockoutDays;
    const scheduleStartDay = dateRangeFor(payload.startDate);
    const scheduleEndDay = dateRangeFor(payload.endDate);
    const availableFixtureDays = Math.round((scheduleEndDay.start - scheduleStartDay.start) / 86400000) + 1;
    if (availableFixtureDays < requiredFixtureDays) {
        throw new Error(`This ${groupCount}-group format needs at least ${requiredFixtureDays} calendar day(s): ${groupFixtures} group fixtures plus the complete knockout route. Extend the tournament dates before creating it.`);
    }

    const requiresApproval = creator.role === "super-admin" && playground.playgroundAdmin.toString() !== String(createdBy);

    let tournament;
    try {
        tournament = await Tournament.create({
            ...payload,
            // Badminton is always an individual or doubles competition; the
            // other sports keep the normal team format.
            matchFormat: payload.sportType === "Badminton" ? (payload.playingMembers === 1 ? "Singles" : "Doubles") : "Team",
            nameKey,
            playground: playground._id,
            playgrounds: [playground._id],
            createdBy,
            groupCount,
            teamsPerGroup,
            status: requiresApproval ? "Pending Approval" : "Upcoming",
            venueApprovalStatus: requiresApproval ? "Pending" : "Not Required",
            venueApprovalRequestedAt: requiresApproval ? new Date() : null,
            drawScheduledAt: officialDrawTime(payload.startDate),
        });
    } catch (error) {
        if (error?.code === 11000) {
            throw new Error("Duplicate tournament detected. An event with this name, playground and start date already exists. Change one of those details and try again.");
        }
        throw error;
    }

    const groups = requiresApproval ? [] : await createTournamentGroups(tournament);
    if (!requiresApproval) await Playground.findByIdAndUpdate(playground._id, { $inc: { tournamentCount: 1 } });

    return { tournament, groups };
};

const createTournamentGroups = async (tournament) => {
    const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
    return Promise.all(Array.from({ length: tournament.groupCount }, (_, index) => TournamentGroup.create({
        tournament: tournament._id,
        name: `Group ${groupNames[index]}`,
        playground: tournament.playground,
    })));
};

const normalizedPhone = (value) => String(value || "").replace(/\D/g, "");
const normalizedTeamName = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

// Fixture information is operational data. Venue/platform operators may view
// their event's demo and final draw; a customer must have registered a team.
const assertFixtureViewer = async (tournamentId, actor = {}) => {
    const tournament = await Tournament.findOne({ _id: tournamentId, isDeleted: false }).select("playground fixturesPublishedAt");
    if (!tournament) throw new Error("Tournament not found.");

    if (actor.role === "super-admin") return { tournament, team: null };
    if (actor.role === "playground-admin") {
        const ownsVenue = await Playground.exists({ _id: tournament.playground, playgroundAdmin: actor.userId, isDeleted: false });
        if (!ownsVenue) throw new Error("Only the tournament venue admin can view these fixtures.");
        return { tournament, team: null };
    }
    if (actor.role === "customer") {
        const team = await TournamentTeam.findOne({ tournament: tournamentId, registeredBy: actor.userId, isDeleted: false }).select("_id paymentStatus");
        if (!team) throw new Error("Register a team to view this tournament's fixture centre.");
        return { tournament, team };
    }
    throw new Error("You are not authorized to view tournament fixtures.");
};

const validateRoster = async (tournament, tournamentId, payload) => {
    const captain = payload.captain || {};
    const players = Array.isArray(payload.players) ? payload.players : [];
    if (!captain.name?.trim() || !normalizedPhone(captain.phone) || !captain.photo) {
        throw new Error("Captain name, phone number and photo are required.");
    }
    const playingCount = 1 + players.filter((player) => player.isPlaying).length;
    const extraCount = players.filter((player) => !player.isPlaying).length;
    if (playingCount !== tournament.playingMembers) throw new Error(`Provide the captain plus exactly ${tournament.playingMembers - 1} playing player(s).`);
    if (extraCount > tournament.extraMembers) throw new Error(`Maximum ${tournament.extraMembers} extra player(s) allowed.`);
    if (players.some((player) => !player.name?.trim() || !normalizedPhone(player.phone) || !player.photo)) {
        throw new Error("Every listed player must have a name, phone number and photo.");
    }

    const rosterPhones = [captain, ...players].map((player) => normalizedPhone(player.phone));
    if (rosterPhones.some((phone) => !phone) || new Set(rosterPhones).size !== rosterPhones.length) {
        throw new Error("The same player cannot be listed twice in one team.");
    }

    const existingTeams = await TournamentTeam.find({ tournament: tournamentId, isDeleted: false }).select("captain contactNumber players teamName");
    if (existingTeams.some((team) => normalizedTeamName(team.teamName) === normalizedTeamName(payload.teamName))) {
        throw new Error("This team is already registered for this tournament. The same team may register again in a different tournament.");
    }
    const duplicate = existingTeams.find((team) => {
        const existingPhones = [
            normalizedPhone(team.captain?.phone || team.contactNumber),
            ...(team.players || []).map((player) => normalizedPhone(player.phone)),
        ];
        return rosterPhones.some((phone) => existingPhones.includes(phone));
    });
    if (duplicate) throw new Error(`A player in this roster is already registered for ${duplicate.teamName} in this tournament. The same player may join a different tournament.`);
    return { captain, players, playingCount, extraCount };
};

const respondToVenueApproval = async (tournamentId, adminId, decision) => {
    const tournament = await Tournament.findOne({ _id: tournamentId, isDeleted: false });
    if (!tournament) throw new Error("Tournament not found.");
    if (tournament.venueApprovalStatus !== "Pending") throw new Error("This tournament does not have a pending venue approval.");
    const playground = await Playground.findOne({ _id: tournament.playground, playgroundAdmin: adminId, isDeleted: false });
    if (!playground) throw new Error("Only the selected playground admin can respond to this request.");

    tournament.venueApprovalStatus = decision === "approve" ? "Approved" : "Rejected";
    tournament.venueApprovalRespondedAt = new Date();
    tournament.status = decision === "approve" ? "Upcoming" : "Cancelled";
    tournament.cancelledAt = decision === "approve" ? null : new Date();
    await tournament.save();
    if (decision === "approve") {
        await createTournamentGroups(tournament);
        await Playground.findByIdAndUpdate(playground._id, { $inc: { tournamentCount: 1 } });
    }
    await createNotification({
        recipient: tournament.createdBy,
        type: "VenueApproval",
        title: decision === "approve" ? "Tournament venue approved" : "Tournament venue request declined",
        message: `The venue owner ${decision}d the request for \"${tournament.name}\".`,
        link: "tournament.html",
    });
    return tournament;
};

// ===================================================
// Get All Tournaments
// ===================================================

// Keep the card status aligned with the Bangladesh tournament calendar.  A
// tournament must not remain "Upcoming" once its first calendar day starts,
// even if a missed scheduler run meant its fixtures were not generated.
const refreshTournamentStatuses = async () => {
    const today = dayRange(calendarDate()).start;

    // Older scheduler runs may have cancelled an event before its actual
    // registration deadline. Re-open only those records; a tournament that
    // was cancelled after the two-day cut-off must remain cancelled.
    const schedulerCancelled = await Tournament.find({
        isDeleted: false,
        status: "Cancelled",
        cancellationProcessed: true,
    }).select("_id startDate cancelledAt");
    for (const tournament of schedulerCancelled) {
        if (!tournament.cancelledAt && new Date() < tournamentRegistrationClosesAt(tournament.startDate)) {
            await Tournament.updateOne({ _id: tournament._id }, { $set: { status: "Upcoming", cancellationProcessed: false } });
        }
    }

    await Tournament.updateMany({
        isDeleted: false,
        status: { $in: ["Upcoming", "Group Stage", "Knockout Stage"] },
        endDate: { $lt: today },
    }, { $set: { status: "Completed" } });

    await Tournament.updateMany({
        isDeleted: false,
        status: "Upcoming",
        startDate: { $lte: today },
        endDate: { $gte: today },
    }, { $set: { status: "Group Stage" } });
};

const tournamentVenueFilter = (playgroundIds) => ({
    $or: [
        { playground: { $in: playgroundIds } },
        { playgrounds: { $in: playgroundIds } },
    ],
});

// Older data may contain the same event twice with an off-by-one-day date.
// Keep one canonical card for identical venue/name/format records created for
// the same start window, favouring an active event over a cancelled one.
const withoutLegacyDuplicates = (tournaments) => {
    const canonical = [];
    for (const tournament of tournaments) {
        const venue = String(tournament.playground?._id || tournament.playground || tournament.playgrounds?.[0]?._id || "");
        const signature = `${venue}|${tournamentNameKey(tournament.name)}|${tournament.sportType}|${tournament.registrationFee}|${tournament.totalTeams}`;
        const startAt = new Date(tournament.startDate).getTime();
        const savedIndex = canonical.findIndex(({ item, key, start }) => key === signature && Math.abs(start - startAt) <= 36 * 60 * 60 * 1000);
        if (savedIndex === -1) {
            canonical.push({ item: tournament, key: signature, start: startAt });
            continue;
        }
        const saved = canonical[savedIndex].item;
        if (saved.status === "Cancelled" && tournament.status !== "Cancelled") {
            canonical[savedIndex] = { item: tournament, key: signature, start: startAt };
        }
    }
    return canonical.map(({ item }) => item);
};

const getAllTournaments = async (actor = {}) => {
    await refreshTournamentStatuses();
    const filters = {
        isDeleted: false,
        $or: [
            { venueApprovalStatus: { $in: ["Approved", "Not Required"] } },
            { venueApprovalStatus: { $exists: false } },
        ],
    };
    if (actor.role === "playground-admin") {
        const playgrounds = await Playground.find({ playgroundAdmin: actor.userId, isDeleted: false }).select("_id");
        filters.$and = [tournamentVenueFilter(playgrounds.map((playground) => playground._id))];
    }
    const tournaments = await Tournament.find(filters)
        .populate("createdBy", "name email")
        .populate("playground", "name address sportType")
        .populate("playgrounds", "name address sportType")
        .sort({ createdAt: -1 });

    const visibleTournaments = withoutLegacyDuplicates(tournaments);
    const tournamentIds = visibleTournaments.map((tournament) => tournament._id);
    const teamCounts = tournamentIds.length ? await TournamentTeam.aggregate([
        { $match: { tournament: { $in: tournamentIds }, isDeleted: false } },
        {
            $group: {
                _id: "$tournament",
                registeredTeamCount: { $sum: 1 },
                paidTeamCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] } },
            },
        },
    ]) : [];
    const countsByTournament = new Map(teamCounts.map((count) => [String(count._id), count]));

    return visibleTournaments.map((tournament) => {
        const safeTournament = tournament.toObject();
        const counts = countsByTournament.get(String(tournament._id));
        safeTournament.registeredTeamCount = counts?.registeredTeamCount || 0;
        safeTournament.paidTeamCount = counts?.paidTeamCount || 0;
        if (tournament.drawStatus === "Completed") return safeTournament;
        // Keep the unannounced sequence server-side. Only socket reveal events
        // disclose a placement while the live ceremony is in progress.
        safeTournament.drawSequence = [];
        return safeTournament;
    });
};

// Customer registrations are kept separate from the public tournament list so
// a customer can manage (or cancel) only their own team.
const getMyRegistrations = async (customerId) => TournamentTeam.find({
    registeredBy: customerId,
    isDeleted: false,
}).populate("tournament", "name startDate endDate status registrationFee").sort({ createdAt: -1 });

const cancelRegistration = async (teamId, customerId) => {
    const team = await TournamentTeam.findOne({ _id: teamId, registeredBy: customerId, isDeleted: false }).populate("tournament", "status startDate name");
    if (!team) throw new Error("Tournament registration not found.");
    const cancellationDeadline = tournamentRegistrationClosesAt(team.tournament.startDate);
    if (team.tournament.status !== "Upcoming" || new Date() >= cancellationDeadline) {
        throw new Error("Tournament registrations can only be cancelled at least 2 days before the tournament starts.");
    }
    const paidPayment = await Payment.findOne({ tournamentTeam: team._id, customer: customerId, paymentStatus: "Paid", isDeleted: false });
    const refundAmount = paidPayment?.amount || 0;
    team.isDeleted = true;
    if (paidPayment) {
        paidPayment.paymentStatus = "Refunded";
        paidPayment.refundAmount = refundAmount;
        paidPayment.refundStatus = "Completed";
        paidPayment.refundReason = "Customer cancelled an eligible tournament registration.";
        team.paymentStatus = "Refunded";
    }
    await Promise.all([
        team.save(),
        paidPayment?.save(),
        Payment.updateMany(
            { tournamentTeam: team._id, customer: customerId, paymentStatus: "Pending", isDeleted: false },
            { $set: { paymentStatus: "Cancelled" } }
        ),
    ]);
    const refundMessage = refundAmount ? ` A full refund of BDT ${refundAmount} has been completed to your original payment method.` : " No payment was captured, so no refund was needed.";
    await createNotification({
        recipient: customerId,
        type: "TournamentRegistrationCancelled",
        title: "Tournament registration cancelled",
        message: `Your ${team.teamName} registration for ${team.tournament.name} has been cancelled.${refundMessage}`,
        link: "tournament.html",
    });
    emitDashboardUpdate({ type: "customer-tournament-registration-cancelled", tournamentId: team.tournament._id, teamId: team._id, refundAmount });
    return { team, refundAmount };
};

// ===================================================
// Get Single Tournament
// ===================================================

const getSingleTournament = async (id) => {
    await refreshTournamentStatuses();
    const tournament = await Tournament.findOne({
        _id: id,
        isDeleted: false,
    })
        .populate("createdBy", "name email")
        .populate("playground", "name address sportType")
        .populate("playgrounds", "name address sportType");

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    if (tournament.drawStatus !== "Completed") {
        const safeTournament = tournament.toObject();
        safeTournament.drawSequence = [];
        return safeTournament;
    }
    return tournament;
};

// ===================================================
// Get Tournament Groups
// ===================================================

const getTournamentGroups = async (tournamentId, actor) => {
    await assertFixtureViewer(tournamentId, actor);
    const groups = await TournamentGroup.find({
        tournament: tournamentId,
    })
        .populate("playground", "name address sportType")
        .sort({ name: 1 });

    return groups;
};

// ===================================================
// Add Team
// ===================================================

const addTeam = async (tournamentId, payload, actor) => {
    const tournament = await Tournament.findOne({
        _id: tournamentId,
        isDeleted: false,
    });

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    if (actor?.role !== "super-admin") {
        const ownVenue = await Playground.findOne({ _id: tournament.playground, playgroundAdmin: actor?.userId, isDeleted: false });
        if (!ownVenue) throw new Error("Only the tournament venue admin can add teams.");
    }

    const registrationDeadline = tournamentRegistrationClosesAt(tournament.startDate);
    if (tournament.status !== "Upcoming" || new Date() >= registrationDeadline) {
        throw new Error("Team registration closes two calendar days before the tournament starts.");
    }

    const totalRegistered = await TournamentTeam.countDocuments({
        tournament: tournamentId,
        isDeleted: false,
    });

    if (totalRegistered >= tournament.totalTeams) {
        throw new Error("All team slots are filled for this tournament.");
    }

    const { captain, players, playingCount, extraCount } = await validateRoster(tournament, tournamentId, payload);

    const totalPlayers = playingCount + extraCount;
    if (totalPlayers < 1) {
        throw new Error("At least one player must be added.");
    }

    const team = await TournamentTeam.create({
        tournament: tournamentId,
        // Teams have no group until the official lottery draw.
        group: null,
        teamName: payload.teamName,
        captain,
        contactNumber: captain.phone,
        players: players,
        paymentStatus: "Pending",
    });

    return team;
};

// ===================================================
// Register Team (Customer)
// ===================================================

const registerTeam = async (tournamentId, payload, customerId) => {
    const tournament = await Tournament.findOne({
        _id: tournamentId,
        isDeleted: false,
    });

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    const tournamentStart = new Date(tournament.startDate);
    tournamentStart.setHours(0, 0, 0, 0);
    if (tournament.status !== "Upcoming" || new Date() >= tournamentStart) {
        throw new Error("Tournament registration is closed.");
    }

    const registrationDeadline = tournamentRegistrationClosesAt(tournament.startDate);
    if (new Date() >= registrationDeadline) {
        throw new Error("Tournament registration is closed. Teams must register at least two calendar days before the tournament starts.");
    }

    const existingCustomerTeam = await TournamentTeam.exists({
        tournament: tournamentId,
        registeredBy: customerId,
        isDeleted: false,
    });
    if (existingCustomerTeam) {
        throw new Error("You have already registered one team for this tournament. You may register a team in another tournament.");
    }

    const totalRegistered = await TournamentTeam.countDocuments({
        tournament: tournamentId,
        isDeleted: false,
    });

    if (totalRegistered >= tournament.totalTeams) {
        throw new Error("All team slots are filled for this tournament.");
    }

    const { captain, players } = await validateRoster(tournament, tournamentId, payload);

    const team = await TournamentTeam.create({
        tournament: tournamentId,
        // Group placement is intentionally withheld until the live lottery.
        group: null,
        teamName: payload.teamName,
        captain,
        contactNumber: captain.phone,
        players: players,
        registeredBy: customerId,
        paymentStatus: "Pending",
    });

    return team;
};

// ===================================================
// Get Tournament Teams
// ===================================================

const getTournamentTeams = async (tournamentId, groupId, actor) => {
    await assertFixtureViewer(tournamentId, actor);
    const filter = { tournament: tournamentId, isDeleted: false };

    if (groupId) {
        filter.group = groupId;
    }

    const teams = await TournamentTeam.find(filter)
        .populate("group", "name")
        .sort({ position: 1, points: -1, goalDifference: -1 });

    return teams;
};

// ===================================================
// Generate Group Stage Matches
// ===================================================

// Circle-method round robin: every group plays one opponent per matchday,
// exactly like a FIFA group-stage draw. It supports 2–8 teams (and a bye if
// an odd-sized legacy group is ever encountered).
const buildRoundRobinMatchdays = (teams) => {
    const rotation = [...teams];
    if (rotation.length % 2) rotation.push(null);
    const matchdays = [];
    const rounds = rotation.length - 1;

    for (let round = 0; round < rounds; round += 1) {
        const matches = [];
        for (let index = 0; index < rotation.length / 2; index += 1) {
            const teamA = rotation[index];
            const teamB = rotation[rotation.length - 1 - index];
            if (teamA && teamB) matches.push({ teamA, teamB });
        }
        matchdays.push(matches);
        rotation.splice(1, 0, rotation.pop());
    }
    return matchdays;
};

// Only paid registrations are eligible for the official draw. Keep at least
// two teams in every active group, so an underfilled competition can still
// run professionally from the four-team minimum.
const shuffleTeams = (teams) => {
    const shuffled = [...teams];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = randomInt(index + 1);
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
};

const prepareFixtureGroups = async (tournament, teams) => {
    const effectiveGroupCount = Math.max(2, Math.min(tournament.groupCount, Math.floor(teams.length / 2)));
    const allGroups = await TournamentGroup.find({ tournament: tournament._id }).sort({ name: 1 });
    const groups = allGroups.slice(0, effectiveGroupCount);
    if (groups.length !== effectiveGroupCount) throw new Error("Tournament groups are not available yet.");

    // Round-robin distribution after a Fisher-Yates shuffle keeps groups
    // balanced while making every team placement genuinely random.
    const drawnTeams = shuffleTeams(teams);
    const drawSequence = drawnTeams.map((team, index) => ({
        team: team._id,
        group: groups[index % groups.length]._id,
    }));
    if (allGroups.length > effectiveGroupCount) {
        await TournamentGroup.deleteMany({ _id: { $in: allGroups.slice(effectiveGroupCount).map((group) => group._id) } });
    }
    if (tournament.groupCount !== effectiveGroupCount || tournament.teamsPerGroup !== Math.ceil(teams.length / effectiveGroupCount)) {
        tournament.groupCount = effectiveGroupCount;
        tournament.teamsPerGroup = Math.ceil(teams.length / effectiveGroupCount);
        await tournament.save();
    }
    return { groups, drawSequence };
};

const drawAudience = (teams, adminId) => [...new Set([
    ...teams.map((team) => String(team.registeredBy || "")).filter(Boolean),
    String(adminId || ""),
].filter(Boolean))];

const publishDrawEvent = (audience, event, payload) => {
    audience.forEach((userId) => emitToUser(userId, event, payload));
};

const finaliseTournamentDraw = async (tournamentId, audience) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.drawStatus !== "Live") return;

    const assignments = tournament.drawSequence || [];
    await Promise.all(assignments.map((entry) => TournamentTeam.updateOne(
        { _id: entry.team, tournament: tournament._id },
        { $set: { group: entry.group } },
    )));
    const matches = await generateGroupMatches(tournament._id.toString());

    tournament.status = "Group Stage";
    tournament.drawStatus = "Completed";
    tournament.drawRevealIndex = assignments.length;
    tournament.drawCompletedAt = new Date();
    tournament.fixturesPublishedAt = new Date();
    await tournament.save();

    const registeredTeams = await TournamentTeam.find({
        tournament: tournament._id,
        paymentStatus: "Paid",
        registeredBy: { $ne: null },
        isDeleted: false,
    }).populate("group", "name").select("registeredBy teamName group");
    await Promise.all(registeredTeams.map((team) => createNotification({
        title: "Official lottery completed — fixture ready",
        message: `${team.teamName} was drawn into ${team.group?.name || "the official group"} for ${tournament.name}. Your final match fixture is now available.`,
        link: `tournament.html?fixture=${tournament._id}`,
    })));

    publishDrawEvent(audience, "tournament:draw:completed", {
        tournamentId: String(tournament._id),
        tournamentName: tournament.name,
        fixtureCount: matches.length,
        completedAt: tournament.drawCompletedAt,
    });
    emitDashboardUpdate({ type: "tournament-draw-completed", tournamentId: tournament._id });
};

const scheduleTournamentDraw = ({ tournament, teams, groups, adminId }) => {
    const tournamentId = String(tournament._id);
    if (activeDrawTimers.has(tournamentId)) return;
    const audience = drawAudience(teams, adminId);
    const groupById = new Map(groups.map((group) => [String(group._id), group]));
    const teamById = new Map(teams.map((team) => [String(team._id), team]));
    const timers = [];
    const revealedCount = Number(tournament.drawRevealIndex || 0);

    tournament.drawSequence.forEach((entry, index) => {
        if (index < revealedCount) return;
        const timer = setTimeout(async () => {
            try {
                const liveTournament = await Tournament.findOne({ _id: tournamentId, drawStatus: "Live" });
                if (!liveTournament) return;
                liveTournament.drawRevealIndex = index + 1;
                await liveTournament.save();
                const team = teamById.get(String(entry.team));
                const group = groupById.get(String(entry.group));
                publishDrawEvent(audience, "tournament:draw:reveal", {
                    tournamentId,
                    tournamentName: tournament.name,
                    index: index + 1,
                    total: tournament.drawSequence.length,
                    team: { id: String(entry.team), name: team?.teamName || "Registered team" },
                    group: { id: String(entry.group), name: group?.name || "Official group" },
                });
                if (index === tournament.drawSequence.length - 1) {
                    await finaliseTournamentDraw(tournamentId, audience);
                    activeDrawTimers.delete(tournamentId);
                }
            } catch (error) {
                console.error("Unable to publish tournament draw reveal:", error.message);
            }
        }, (index - revealedCount + 1) * DRAW_REVEAL_INTERVAL_MS);
        timers.push(timer);
    });
    activeDrawTimers.set(tournamentId, timers);
};

// A process restart must not leave an official ceremony stuck in Live. The
// scheduler resumes from the last persisted reveal; already announced teams
// are never sent again.
const resumeLiveTournamentDraws = async () => {
    const liveTournaments = await Tournament.find({ drawStatus: "Live", isDeleted: false });
    await Promise.all(liveTournaments.map(async (tournament) => {
        const tournamentId = String(tournament._id);
        if (activeDrawTimers.has(tournamentId)) return;
        const teams = await TournamentTeam.find({
            tournament: tournament._id,
            paymentStatus: "Paid",
            isDeleted: false,
        }).sort({ createdAt: 1 });
        const groups = await TournamentGroup.find({ tournament: tournament._id }).sort({ name: 1 });
        if (!tournament.drawSequence?.length || !teams.length || !groups.length) return;
        if (Number(tournament.drawRevealIndex || 0) >= tournament.drawSequence.length) {
            await finaliseTournamentDraw(tournamentId, drawAudience(teams, tournament.createdBy));
            return;
        }
        scheduleTournamentDraw({ tournament, teams, groups, adminId: tournament.createdBy });
    }));
};

const generateGroupMatches = async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    if (tournament.status !== "Upcoming") {
        throw new Error("Matches can only be generated for upcoming tournaments.");
    }

    if (!["Live", "Completed"].includes(tournament.drawStatus)) {
        throw new Error("The venue administrator must conduct the official group lottery before final fixtures can be generated.");
    }

    // The complete draw is intentionally embargoed until the calendar day
    // before kick-off, after the registration window has closed.
    const fixtureReleaseDay = dayRange(calendarDate(new Date(), 1));
    if (new Date(tournament.startDate).getTime() !== fixtureReleaseDay.start.getTime()) {
        throw new Error("Final fixtures are released automatically one calendar day before the tournament starts.");
    }

    const existingMatches = await TournamentMatch.countDocuments({
        tournament: tournamentId,
    });

    if (existingMatches > 0) {
        throw new Error("Matches have already been generated for this tournament.");
    }

    const allTeams = await TournamentTeam.find({
        tournament: tournamentId,
        paymentStatus: "Paid",
        isDeleted: false,
    }).populate("group").sort({ createdAt: 1 });

    if (allTeams.length < 4) {
        throw new Error("At least four paid teams are required to publish tournament fixtures.");
    }

    const groups = await TournamentGroup.find({ tournament: tournament._id }).sort({ name: 1 });
    if (!groups.length || allTeams.some((team) => !team.group)) {
        throw new Error("Official group lottery results are not available yet.");
    }

    const matches = [];
    // Three professional match windows per day: 09:00–12:00, 13:00–16:00,
    // and 17:00–20:00. They remain within the venue's 09:00–21:00 window
    // and leave a practical turnaround buffer between games.
    const dailyMatchCapacity = 3;
    const startDate = new Date(tournament.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(tournament.endDate);
    endDate.setHours(23, 59, 59, 999);
    let fixtureIndex = 0;

    const groupSchedules = groups.map((group) => ({
        group,
        matchdays: buildRoundRobinMatchdays(allTeams.filter((team) => String(team.group?._id || team.group) === String(group._id))),
    }));
    const totalMatchdays = Math.max(...groupSchedules.map((schedule) => schedule.matchdays.length));

    // Schedule every group's Matchday 1 before Matchday 2, then Matchday 3.
    // This guarantees recovery time and prevents any team from playing twice
    // in the same FIFA-style matchday.
    for (let matchday = 0; matchday < totalMatchdays; matchday += 1) {
        for (const schedule of groupSchedules) {
            for (const pairing of schedule.matchdays[matchday] || []) {
                const dayOffset = Math.floor(fixtureIndex / dailyMatchCapacity);
                const startHour = [9, 13, 17][fixtureIndex % dailyMatchCapacity];
                const endHour = startHour + 3;
                const matchDateClone = new Date(startDate);
                matchDateClone.setDate(matchDateClone.getDate() + dayOffset);
                if (matchDateClone > endDate) {
                    throw new Error("Tournament dates do not have enough time for every group-stage fixture. Extend the end date or reduce the number of teams.");
                }

                const startTimeStr = `${startHour.toString().padStart(2, "0")}:00`;
                const endTimeStr = `${endHour.toString().padStart(2, "0")}:00`;

                const match = await TournamentMatch.create({
                    tournament: tournamentId,
                    group: schedule.group._id,
                    stage: "Group",
                    matchday: matchday + 1,
                    teamA: pairing.teamA._id,
                    teamB: pairing.teamB._id,
                    playground: schedule.group.playground._id,
                    matchDate: matchDateClone,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    matchStatus: "Scheduled",
                });

                matches.push(match);
                fixtureIndex += 1;
            }
        }
    }

    await Tournament.findByIdAndUpdate(tournamentId, { status: "Group Stage" });

    return matches;
};

// ===================================================
// Conduct Official Group Lottery (Venue Admin)
// ===================================================

const conductTournamentDraw = async (tournamentId, adminId) => {
    const tournament = await Tournament.findOne({ _id: tournamentId, isDeleted: false });
    if (!tournament) throw new Error("Tournament not found.");

    const venue = await Playground.findOne({ _id: tournament.playground, playgroundAdmin: adminId, isDeleted: false });
    if (!venue) throw new Error("Only the tournament venue administrator can conduct this draw.");
    if (tournament.status !== "Upcoming") throw new Error("The official draw is available only before the tournament begins.");
    if (tournament.drawStatus === "Completed") throw new Error("This tournament's official lottery has already been completed.");
    if (tournament.drawStatus === "Live") throw new Error("The official lottery is already live. Wait for the final placement reveal.");

    const fixtureReleaseDay = dayRange(calendarDate(new Date(), 1));
    if (new Date(tournament.startDate).getTime() !== fixtureReleaseDay.start.getTime()) {
        throw new Error("The official lottery can be conducted only on the calendar day before the tournament starts.");
    }
    if (tournament.drawScheduledAt && new Date() < new Date(tournament.drawScheduledAt)) {
        throw new Error(`The live lottery is scheduled for ${new Date(tournament.drawScheduledAt).toLocaleString("en-GB")}. Registered teams receive a reminder two hours before it starts.`);
    }
    if (await TournamentMatch.exists({ tournament: tournament._id })) throw new Error("The final fixture has already been published for this tournament.");

    const teams = await TournamentTeam.find({
        tournament: tournament._id,
        paymentStatus: "Paid",
        isDeleted: false,
    }).sort({ createdAt: 1 });
    if (teams.length < 4) throw new Error("At least four paid teams are required to conduct the official draw.");

    const { groups, drawSequence } = await prepareFixtureGroups(tournament, teams);
    tournament.drawSequence = drawSequence;
    tournament.drawStatus = "Live";
    tournament.drawStartedAt = new Date();
    tournament.drawRevealIndex = 0;
    await tournament.save();

    const audience = drawAudience(teams, adminId);
    publishDrawEvent(audience, "tournament:draw:started", {
        tournamentId: String(tournament._id),
        tournamentName: tournament.name,
        total: drawSequence.length,
        startedAt: tournament.drawStartedAt,
        revealIntervalMs: DRAW_REVEAL_INTERVAL_MS,
    });
    scheduleTournamentDraw({ tournament, teams, groups, adminId });
    emitDashboardUpdate({ type: "tournament-draw-started", tournamentId: tournament._id });
    return { tournament, groups, totalDraws: drawSequence.length, revealIntervalMs: DRAW_REVEAL_INTERVAL_MS };

    /*
        recipient: team.registeredBy,
        type: "TournamentDrawCompleted",
        title: "Official lottery completed — fixture ready",
        message: `${team.teamName} was drawn into ${team.group?.name || "the official group"} for ${tournament.name}. Your final match fixture is now available.`,
        link: `tournament.html?fixture=${tournament._id}`,
    })));
    emitDashboardUpdate({ type: "tournament-draw-completed", tournamentId: tournament._id });
    return { tournament, groups, matches };
    */
};

// ===================================================
// Get Tournament Matches
// ===================================================

const getTournamentMatches = async (tournamentId, stage, actor) => {
    const { tournament, team } = await assertFixtureViewer(tournamentId, actor);
    // A registered customer receives the official named fixture only once the
    // system has published it. Until then the UI shows the private demo draw.
    if (actor?.role === "customer" && (!tournament.fixturesPublishedAt || team.paymentStatus !== "Paid")) return [];
    const filter = { tournament: tournamentId };

    if (stage) {
        filter.stage = stage;
    }

    const matches = await TournamentMatch.find(filter)
        .populate("teamA", "teamName")
        .populate("teamB", "teamName")
        .populate("playground", "name address")
        .populate("group", "name")
        .sort({ matchDate: 1, startTime: 1 });

    return matches;
};

// ===================================================
// Update Match Result
// ===================================================

const assertPreviousRoundsCompleted = async (match, targetStage = match.stage) => {
    const dependencies = {
        "Quarter Final": [{ stage: "Group", required: true }],
        "Semi Final": [{ stage: "Group", required: true }, { stage: "Quarter Final", required: false }],
        "Final": [{ stage: "Group", required: true }, { stage: "Quarter Final", required: false }, { stage: "Semi Final", required: true }],
        "Third Place": [{ stage: "Group", required: true }, { stage: "Quarter Final", required: false }, { stage: "Semi Final", required: true }],
    };

    for (const dependency of dependencies[targetStage] || []) {
        const matches = await TournamentMatch.find({ tournament: match.tournament, stage: dependency.stage }).select("matchStatus");
        if (dependency.required && !matches.length) {
            throw new Error(`${targetStage} cannot start because ${dependency.stage} fixtures have not been generated yet.`);
        }
        if (matches.some((fixture) => fixture.matchStatus !== "Completed")) {
            throw new Error(`${targetStage} is locked until every ${dependency.stage.toLowerCase()} match is completed.`);
        }
    }
};

const advanceKnockoutBracket = async (completedMatch) => {
    if (!['Quarter Final', 'Semi Final'].includes(completedMatch.stage)) return;
    const tournament = await Tournament.findById(completedMatch.tournament).select('sportType playground endDate');
    if (!tournament) return;
    const withinTournament = (date) => {
        const end = new Date(tournament.endDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) throw new Error('The tournament end date is too early for the next knockout round. Extend the tournament dates before recording the final qualifying result.');
    };
    const nextDay = (matches) => {
        const latest = [...matches].sort((first, second) => new Date(second.matchDate) - new Date(first.matchDate))[0];
        const date = new Date(latest.matchDate);
        date.setDate(date.getDate() + 1);
        withinTournament(date);
        return date;
    };

    if (completedMatch.stage === 'Quarter Final') {
        const quarterFinals = await TournamentMatch.find({ tournament: tournament._id, stage: 'Quarter Final' }).sort({ matchDate: 1, startTime: 1 });
        if (quarterFinals.length !== 4 || quarterFinals.some((match) => match.matchStatus !== 'Completed') || await TournamentMatch.exists({ tournament: tournament._id, stage: 'Semi Final' })) return;
        const date = nextDay(quarterFinals);
        await Promise.all([
            TournamentMatch.create({ tournament: tournament._id, stage: 'Semi Final', teamA: quarterFinals[0].winner, teamB: quarterFinals[2].winner, playground: tournament.playground, matchDate: date, startTime: '13:00', endTime: '16:00', matchStatus: 'Scheduled' }),
            TournamentMatch.create({ tournament: tournament._id, stage: 'Semi Final', teamA: quarterFinals[1].winner, teamB: quarterFinals[3].winner, playground: tournament.playground, matchDate: date, startTime: '17:00', endTime: '20:00', matchStatus: 'Scheduled' }),
        ]);
        return;
    }

    const semiFinals = await TournamentMatch.find({ tournament: tournament._id, stage: 'Semi Final' }).sort({ matchDate: 1, startTime: 1 });
    if (semiFinals.length !== 2 || semiFinals.some((match) => match.matchStatus !== 'Completed') || await TournamentMatch.exists({ tournament: tournament._id, stage: 'Final' })) return;
    const date = nextDay(semiFinals);
    const finalMatches = [
        TournamentMatch.create({ tournament: tournament._id, stage: 'Final', teamA: semiFinals[0].winner, teamB: semiFinals[1].winner, playground: tournament.playground, matchDate: date, startTime: '17:00', endTime: '20:00', matchStatus: 'Scheduled' }),
    ];
    if (tournament.sportType === 'Football') {
        const loser = (match) => String(match.winner) === String(match.teamA) ? match.teamB : match.teamA;
        finalMatches.unshift(TournamentMatch.create({ tournament: tournament._id, stage: 'Third Place', teamA: loser(semiFinals[0]), teamB: loser(semiFinals[1]), playground: tournament.playground, matchDate: date, startTime: '13:00', endTime: '16:00', matchStatus: 'Scheduled' }));
    }
    await Promise.all(finalMatches);
};

const updateMatchResult = async (matchId, payload, actor) => {
    const match = await TournamentMatch.findById(matchId);

    if (!match) {
        throw new Error("Match not found.");
    }

    if (match.matchStatus === "Completed") {
        throw new Error("Match result has already been recorded.");
    }

    if (match.matchStatus === "Cancelled") {
        throw new Error("This match is cancelled. Publish its announced reschedule before recording a result.");
    }

    if (!Number.isInteger(payload.teamAScore) || !Number.isInteger(payload.teamBScore) || payload.teamAScore < 0 || payload.teamBScore < 0) {
        throw new Error("Both match scores must be whole numbers of zero or more.");
    }

    if (actor?.role !== "super-admin") {
        const playground = await Playground.findOne({ _id: match.playground, playgroundAdmin: actor?.userId, isDeleted: false });
        if (!playground) throw new Error("Only the tournament venue admin can update this result.");
    }

    await assertPreviousRoundsCompleted(match);

    if (match.stage !== "Group" && payload.teamAScore === payload.teamBScore) {
        throw new Error("FIFA knockout matches cannot end in a draw.");
    }

    const winnerId = payload.teamAScore === payload.teamBScore ? null : (payload.teamAScore > payload.teamBScore ? match.teamA : match.teamB);

    match.teamAScore = payload.teamAScore;
    match.teamBScore = payload.teamBScore;
    if (payload.teamAWickets !== undefined) match.teamAWickets = payload.teamAWickets;
    if (payload.teamBWickets !== undefined) match.teamBWickets = payload.teamBWickets;
    match.winner = winnerId;
    // A score submission is the official completion event; status transitions
    // such as Live/Scheduled belong to the fixture-management endpoint.
    match.matchStatus = "Completed";

    await match.save();
    emitDashboardUpdate({ type: "match-result", matchId: match._id, tournamentId: match.tournament });

    if (match.stage === "Group") {
        const teamA = await TournamentTeam.findById(match.teamA);
        const teamB = await TournamentTeam.findById(match.teamB);

        teamA.goalsFor += payload.teamAScore;
        teamA.goalsAgainst += payload.teamBScore;
        teamA.goalDifference = teamA.goalsFor - teamA.goalsAgainst;

        teamB.goalsFor += payload.teamBScore;
        teamB.goalsAgainst += payload.teamAScore;
        teamB.goalDifference = teamB.goalsFor - teamB.goalsAgainst;

        if (payload.teamAScore > payload.teamBScore) {
            teamA.won += 1;
            teamA.points += 3;
            teamB.lost += 1;
        } else if (payload.teamBScore > payload.teamAScore) {
            teamB.won += 1;
            teamB.points += 3;
            teamA.lost += 1;
        } else {
            teamA.drawn += 1;
            teamB.drawn += 1;
            teamA.points += 1;
            teamB.points += 1;
        }

        teamA.played += 1;
        teamB.played += 1;

        await teamA.save();
        await teamB.save();

        const remainingGroupMatches = await TournamentMatch.countDocuments({
            tournament: match.tournament,
            stage: "Group",
            matchStatus: { $ne: "Completed" },
        });
        if (remainingGroupMatches === 0) await generateKnockoutStage(match.tournament.toString());
    }

    await advanceKnockoutBracket(match);
    if (match.stage === "Final") await Tournament.updateOne({ _id: match.tournament }, { $set: { status: "Completed" } });

    return match;
};

// ===================================================
// Schedule Match (Admin)
// ===================================================

const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");

const hasTimeClash = (startA, endA, startB, endB) => startA < endB && endA > startB;

const assertNoFixtureConflict = async (match, matchDate, startTime, endTime) => {
    const { start, end } = dateRangeFor(matchDate);
    const otherMatches = await TournamentMatch.find({
        _id: { $ne: match._id },
        matchStatus: { $in: ["Scheduled", "Live"] },
        matchDate: { $gte: start, $lt: end },
        $or: [
            { playground: match.playground },
            { teamA: { $in: [match.teamA, match.teamB] } },
            { teamB: { $in: [match.teamA, match.teamB] } },
        ],
    }).select("teamA teamB playground startTime endTime");

    const conflictingMatch = otherMatches.find((other) => hasTimeClash(startTime, endTime, other.startTime, other.endTime));
    if (!conflictingMatch) return;

    const venueConflict = String(conflictingMatch.playground) === String(match.playground);
    throw new Error(venueConflict
        ? "This playground already has a fixture during the selected time."
        : "One of these teams already has a fixture during the selected time.");
};

const scheduleMatch = async (tournamentId, matchId, payload, actor) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    const match = await TournamentMatch.findById(matchId);

    if (!match || match.tournament.toString() !== tournamentId) {
        throw new Error("Match not found.");
    }

    if (match.matchStatus === "Completed") {
        throw new Error("A completed match cannot be cancelled or rescheduled.");
    }

    if (actor?.role !== "super-admin") {
        const ownVenue = await Playground.findOne({ _id: match.playground, playgroundAdmin: actor?.userId, isDeleted: false });
        if (!ownVenue) throw new Error("Only the tournament venue admin can schedule this match.");
    }

    const scheduledDate = payload.matchDate ? new Date(payload.matchDate) : new Date(match.matchDate);
    const tournamentStart = new Date(tournament.startDate);
    tournamentStart.setHours(0, 0, 0, 0);
    const tournamentEnd = new Date(tournament.endDate);
    tournamentEnd.setHours(23, 59, 59, 999);
    const startTime = payload.startTime || match.startTime;
    const endTime = payload.endTime || match.endTime;
    if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
        throw new Error("Match end time must be after the kick-off time.");
    }

    if (payload.matchStatus === "Completed") {
        throw new Error("Use the result action to complete a match.");
    }

    // Cancellation is deliberately a separate state from rescheduling. It
    // preserves the original fixture, broadcasts the reason and announced
    // make-up slot, and cannot be scored until an admin reinstates it.
    if (payload.matchStatus === "Cancelled") {
        if (match.matchStatus === "Cancelled") throw new Error("This match is already cancelled. Reschedule it instead.");
        const cancellationDate = payload.rescheduledDate ? new Date(payload.rescheduledDate) : null;
        const cancellationStart = payload.rescheduledStartTime;
        const cancellationEnd = payload.rescheduledEndTime;
        if (!payload.cancellationReason || !payload.cancellationDetails?.trim()) {
            throw new Error("Select a cancellation reason and provide the official notice for teams.");
        }
        if (!cancellationDate || Number.isNaN(cancellationDate.getTime()) || cancellationDate < tournamentStart || !isValidTime(cancellationStart) || !isValidTime(cancellationEnd) || cancellationStart >= cancellationEnd) {
            throw new Error("Give the new match date and a valid start and end time when cancelling a fixture.");
        }
        await assertNoFixtureConflict(match, cancellationDate, cancellationStart, cancellationEnd);
        if (cancellationDate > tournamentEnd) tournament.endDate = cancellationDate;
        match.matchStatus = "Cancelled";
        match.cancellation = {
            reason: payload.cancellationReason,
            details: payload.cancellationDetails.trim(),
            announcedAt: new Date(),
            announcedBy: actor?.userId || null,
            originalDate: match.matchDate,
            originalStartTime: match.startTime,
            originalEndTime: match.endTime,
            rescheduledDate: cancellationDate,
            rescheduledStartTime: cancellationStart,
            rescheduledEndTime: cancellationEnd,
        };
        await Promise.all([match.save(), tournament.save()]);

        const teams = await TournamentTeam.find({ _id: { $in: [match.teamA, match.teamB] } }).select("registeredBy teamName");
        const makeUp = `${new Date(cancellationDate).toLocaleDateString("en-GB")} ${cancellationStart}-${cancellationEnd}`;
        await Promise.all(teams.filter((team) => team.registeredBy).map((team) => createNotification({
            recipient: team.registeredBy,
            type: "MatchCancelled",
            title: "Match cancelled and rescheduled",
            message: `${team.teamName}'s ${match.stage.toLowerCase()} match was cancelled: ${payload.cancellationReason}. ${payload.cancellationDetails.trim()} New match time: ${makeUp}.`,
            link: `tournament.html?fixture=${tournamentId}`,
        })));
        emitDashboardUpdate({ type: "match-cancelled", matchId: match._id, tournamentId: match.tournament });
        return match;
    }

    const isReinstatingCancelledMatch = match.matchStatus === "Cancelled";
    if (isReinstatingCancelledMatch && payload.matchStatus !== "Scheduled") {
        throw new Error("A cancelled match must be rescheduled before it can go live or receive a result.");
    }
    if (isReinstatingCancelledMatch && (!payload.matchDate || !payload.startTime || !payload.endTime)) {
        throw new Error("Set the official replay date, start time and end time before rescheduling this match.");
    }
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate < tournamentStart) {
        throw new Error("Match date cannot be before the tournament start date.");
    }
    if (scheduledDate > tournamentEnd) {
        if (!isReinstatingCancelledMatch) throw new Error("Match date must be within the tournament dates.");
        tournament.endDate = scheduledDate;
    }

    if (payload.teamA) {
        const teamA = await TournamentTeam.findOne({
            _id: payload.teamA,
            tournament: tournamentId,
        });

        if (!teamA) {
            throw new Error("Team A not found in this tournament.");
        }

        match.teamA = payload.teamA;
    }

    if (payload.teamB) {
        const teamB = await TournamentTeam.findOne({
            _id: payload.teamB,
            tournament: tournamentId,
        });

        if (!teamB) {
            throw new Error("Team B not found in this tournament.");
        }

        match.teamB = payload.teamB;
    }

    if (payload.playground) {
        const playground = await Playground.findOne({
            _id: payload.playground,
            isDeleted: false,
            isApproved: true,
            status: "Active",
        });

        if (!playground) {
            throw new Error("Invalid playground.");
        }

        match.playground = payload.playground;
    }

    if (payload.matchDate) {
        match.matchDate = scheduledDate;
    }

    if (payload.startTime) {
        match.startTime = payload.startTime;
    }

    if (payload.endTime) {
        match.endTime = payload.endTime;
    }

    if (payload.stage && payload.stage !== match.stage) {
        throw new Error("The competition stage is fixed by the official bracket and cannot be changed manually.");
    }

    if (payload.matchStatus === "Live") await assertPreviousRoundsCompleted(match);

    if (payload.matchStatus) match.matchStatus = payload.matchStatus;

    await assertNoFixtureConflict(match, scheduledDate, startTime, endTime);

    if (isReinstatingCancelledMatch) {
        match.cancellation.rescheduledDate = scheduledDate;
        match.cancellation.rescheduledStartTime = startTime;
        match.cancellation.rescheduledEndTime = endTime;
    }

    await Promise.all([match.save(), tournament.save()]);
    emitDashboardUpdate({ type: isReinstatingCancelledMatch ? "match-rescheduled" : "match-scheduled", matchId: match._id, tournamentId: match.tournament });

    return match;
};

// ===================================================
// Generate Knockout Stage
// ===================================================

const generateKnockoutStage = async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    if (tournament.status !== "Group Stage") {
        throw new Error("Knockout stage can only be generated after group stage.");
    }

    const unfinishedGroupMatch = await TournamentMatch.exists({
        tournament: tournamentId,
        stage: "Group",
        matchStatus: { $ne: "Completed" },
    });
    if (unfinishedGroupMatch) {
        throw new Error("Knockout stage is locked until every group-stage match, including any cancelled match, has been replayed and completed.");
    }

    const groups = await TournamentGroup.find({ tournament: tournamentId }).sort({ name: 1 });
    const qualifiers = [];
    for (const group of groups) {
        const teams = await TournamentTeam.find({ tournament: tournamentId, group: group._id, isDeleted: false })
            .sort({ points: -1, goalDifference: -1, goalsFor: -1, won: -1 });
        if (teams.length < 2) throw new Error(`Not enough teams in ${group.name} for knockout stage.`);
        qualifiers.push({ winner: teams[0], runnerUp: teams[1], group });
    }

    const lastGroupMatch = await TournamentMatch.findOne({ tournament: tournamentId, stage: "Group" }).sort({ matchDate: -1, startTime: -1 });
    const nextDate = new Date(lastGroupMatch?.matchDate || tournament.startDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const endDate = new Date(tournament.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (nextDate > endDate) throw new Error("Tournament dates need at least one day after group play for the knockout stage.");

    const createMatch = (stage, teamA, teamB, date, startTime, endTime) => TournamentMatch.create({
        tournament: tournamentId, stage, teamA: teamA._id, teamB: teamB._id,
        playground: tournament.playground, matchDate: date, startTime, endTime, matchStatus: "Scheduled",
    });

    let matches;
    if (qualifiers.length === 4) {
        const qfPairs = [
            [qualifiers[0].winner, qualifiers[1].runnerUp],
            [qualifiers[1].winner, qualifiers[0].runnerUp],
            [qualifiers[2].winner, qualifiers[3].runnerUp],
            [qualifiers[3].winner, qualifiers[2].runnerUp],
        ];
        const secondQuarterFinalDay = new Date(nextDate);
        secondQuarterFinalDay.setDate(secondQuarterFinalDay.getDate() + 1);
        if (secondQuarterFinalDay > endDate) throw new Error("Tournament dates need two days for four quarter-finals. Extend the tournament period.");
        matches = await Promise.all([
            createMatch("Quarter Final", ...qfPairs[0], nextDate, "09:00", "12:00"),
            createMatch("Quarter Final", ...qfPairs[1], nextDate, "13:00", "16:00"),
            createMatch("Quarter Final", ...qfPairs[2], nextDate, "17:00", "20:00"),
            createMatch("Quarter Final", ...qfPairs[3], secondQuarterFinalDay, "09:00", "12:00"),
        ]);
    } else if (qualifiers.length === 2) {
        matches = await Promise.all([
            createMatch("Semi Final", qualifiers[0].winner, qualifiers[1].runnerUp, nextDate, "13:00", "16:00"),
            createMatch("Semi Final", qualifiers[1].winner, qualifiers[0].runnerUp, nextDate, "17:00", "20:00"),
        ]);
    } else {
        throw new Error("This knockout generator currently supports two or four groups.");
    }

    await Tournament.findByIdAndUpdate(tournamentId, { status: "Knockout Stage" });
    return matches;
};

// ===================================================
// Get Tournament Standings
// ===================================================

const getTournamentStandings = async (tournamentId, actor) => {
    await assertFixtureViewer(tournamentId, actor);
    const groups = await TournamentGroup.find({
        tournament: tournamentId,
    });

    const standings = [];

    for (const group of groups) {
        const teams = await TournamentTeam.find({
            tournament: tournamentId,
            group: group._id,
        })
            .populate("group", "name")
            .sort({ points: -1, goalDifference: -1, goalsFor: -1 });

        standings.push({
            group: group.name,
            teams,
        });
    }

    return standings;
};

// ===================================================
// Get My Playground Tournaments
// ===================================================

const getMyPlaygroundTournaments = async (adminId) => {
    const playgrounds = await Playground.find({
        playgroundAdmin: adminId,
        isDeleted: false,
    }).select("_id");

    const playgroundIds = playgrounds.map((p) => p._id);

    const tournaments = await Tournament.find({ isDeleted: false, ...tournamentVenueFilter(playgroundIds) })
        .populate("playground", "name address sportType")
        .populate("createdBy", "name email")
        .populate("playgrounds", "name address sportType")
        .sort({ createdAt: -1 });

    return withoutLegacyDuplicates(tournaments);
};

// ===================================================
// Get Tournament Participants
// ===================================================

const getTournamentParticipants = async (tournamentId, adminId) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    const playground = await Playground.findOne({
        _id: { $in: tournament.playgrounds },
        playgroundAdmin: adminId,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("You are not authorized to view participants for this tournament.");
    }

    const teams = await TournamentTeam.find({
        tournament: tournamentId,
        isDeleted: false,
    })
        .populate("group", "name")
        .sort({ createdAt: -1 });

    return teams;
};

// ===================================================
// Update Tournament Team Counts
// ===================================================

const updateTournamentTeamCounts = async (tournamentId, payload, adminId) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    const playground = await Playground.findOne({
        _id: { $in: tournament.playgrounds },
        playgroundAdmin: adminId,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("You are not authorized to update this tournament.");
    }

    if (tournament.status !== "Upcoming") {
        throw new Error("Team counts can only be updated for upcoming tournaments.");
    }

    const { totalTeams, groupCount, teamsPerGroup } = payload;

    if (totalTeams !== undefined) {
        if (totalTeams < 4 || totalTeams > 24) {
            throw new Error("Total teams must be between 4 and 24.");
        }

        if (groupCount && totalTeams % groupCount !== 0) {
            throw new Error(`Total teams must be divisible by group count (${groupCount}).`);
        }

        tournament.totalTeams = totalTeams;
    }

    if (groupCount !== undefined) {
        if (groupCount < 2 || groupCount > 8) {
            throw new Error("Group count must be between 2 and 8.");
        }

        if (totalTeams && totalTeams % groupCount !== 0) {
            throw new Error(`Total teams must be divisible by group count (${groupCount}).`);
        }

        tournament.groupCount = groupCount;
    }

    if (teamsPerGroup !== undefined) {
        if (teamsPerGroup < 2 || teamsPerGroup > 8) {
            throw new Error("Teams per group must be between 2 and 8.");
        }

        tournament.teamsPerGroup = teamsPerGroup;
    }

    await tournament.save();

    return tournament;
};

// ===================================================
// Delete Tournament
// ===================================================

const deleteTournament = async (tournamentId, adminId) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    const isSuperAdmin = adminId === tournament.createdBy;

    const playground = await Playground.findOne({
        _id: { $in: tournament.playgrounds },
        playgroundAdmin: adminId,
        isDeleted: false,
    });

    if (!isSuperAdmin && !playground) {
        throw new Error("You are not authorized to delete this tournament.");
    }

    await Tournament.findByIdAndUpdate(tournamentId, { isDeleted: true });

    return tournament;
};

// ===================================================
// Export Services
// ===================================================

module.exports = {
    createTournament,
    respondToVenueApproval,
    getAllTournaments,
    getMyRegistrations,
    cancelRegistration,
    getSingleTournament,
    getTournamentGroups,
    addTeam,
    registerTeam,
    getTournamentTeams,
    generateGroupMatches,
    conductTournamentDraw,
    resumeLiveTournamentDraws,
    getTournamentMatches,
    updateMatchResult,
    scheduleMatch,
    generateKnockoutStage,
    getTournamentStandings,
    getMyPlaygroundTournaments,
};
