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
const Slot = require("../slot/slot.model");
const { createNotification } = require("../notification/notification.service");
const { emitDashboardUpdate } = require("../../config/socket");
const { calendarDate, dayRange } = require("../../utils/scheduleTime");

// Teams may register up to the day before kick-off.  The official draw is
// released on that same day, once the final paid roster is known.
const registrationClosesAt = (startDate) => {
    const start = new Date(startDate);
    return dayRange({
        year: start.getUTCFullYear(),
        month: start.getUTCMonth() + 1,
        day: start.getUTCDate() - 1,
    }).start;
};

// ===================================================
// Create Tournament
// ===================================================

const createTournament = async (payload, createdBy) => {
    const playground = await Playground.findOne({
        _id: payload.playground,
        isDeleted: false,
        isApproved: true,
        status: "Active",
    });

    if (!playground) {
        throw new Error("Choose one active, approved playground for this tournament.");
    }

    const creator = await User.findById(createdBy).select("role");
    if (!creator) throw new Error("Tournament creator not found.");
    if (creator.role === "playground-admin" && playground.playgroundAdmin.toString() !== String(createdBy)) {
        throw new Error("Playground admins can create tournaments only for their own playground.");
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

    const requiresApproval = creator.role === "super-admin" && playground.playgroundAdmin.toString() !== String(createdBy);

    const tournament = await Tournament.create({
        ...payload,
        playground: playground._id,
        playgrounds: [playground._id],
        createdBy,
        groupCount,
        teamsPerGroup,
        status: requiresApproval ? "Pending Approval" : "Upcoming",
        venueApprovalStatus: requiresApproval ? "Pending" : "Not Required",
        venueApprovalRequestedAt: requiresApproval ? new Date() : null,
    });

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

// Customers never choose their own group.  The next team is placed in the
// least-filled group (A, B, C... is the tie-breaker) so every group remains
// balanced throughout registration.
const assignAutomaticGroup = async (tournamentId, teamsPerGroup) => {
    const groups = await TournamentGroup.find({ tournament: tournamentId }).sort({ name: 1 });
    if (!groups.length) throw new Error("Tournament groups are not available yet.");

    const groupCounts = await Promise.all(groups.map(async (group) => ({
        group,
        count: await TournamentTeam.countDocuments({ tournament: tournamentId, group: group._id, isDeleted: false }),
    })));
    const available = groupCounts.filter(({ count }) => count < teamsPerGroup);
    if (!available.length) throw new Error("All tournament groups are full.");
    available.sort((first, second) => first.count - second.count || first.group.name.localeCompare(second.group.name));
    return available[0].group;
};

const normalizedPhone = (value) => String(value || "").replace(/\D/g, "");

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
    const duplicate = existingTeams.find((team) => {
        const existingPhones = [
            normalizedPhone(team.captain?.phone || team.contactNumber),
            ...(team.players || []).map((player) => normalizedPhone(player.phone)),
        ];
        return rosterPhones.some((phone) => existingPhones.includes(phone));
    });
    if (duplicate) throw new Error(`A player in this roster is already registered for ${duplicate.teamName}. A player may play for only one team in this tournament.`);
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

// Tournament stages are driven by actual fixtures, never only by the date.
// This also repairs older records that were marked "Group Stage" before any
// match was generated.
const refreshTournamentStatuses = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prematureGroupStages = await Tournament.find({
        isDeleted: false,
        status: "Group Stage",
    }).select("_id");
    for (const tournament of prematureGroupStages) {
        const hasFixture = await TournamentMatch.exists({ tournament: tournament._id });
        if (!hasFixture) await Tournament.updateOne({ _id: tournament._id }, { $set: { status: "Upcoming" } });
    }

    // Earlier versions cancelled underfilled events two days before kick-off.
    // Re-open only those scheduler-cancelled records while there is still at
    // least one full calendar day to register; manually/venue-cancelled events
    // do not have cancellationProcessed and remain untouched.
    const tomorrow = dayRange(calendarDate(new Date(), 1));
    await Tournament.updateMany({
        isDeleted: false,
        status: "Cancelled",
        cancellationProcessed: true,
        startDate: { $gte: tomorrow.start },
    }, { $set: { status: "Upcoming", cancellationProcessed: false } });

    await Tournament.updateMany({
        isDeleted: false,
        status: { $in: ["Upcoming", "Group Stage", "Knockout Stage"] },
        endDate: { $lt: today },
    }, { $set: { status: "Completed" } });
};

const tournamentVenueFilter = (playgroundIds) => ({
    $or: [
        { playground: { $in: playgroundIds } },
        { playgrounds: { $in: playgroundIds } },
    ],
});

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

    return tournaments;
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
    const cancellationDeadline = new Date(new Date(team.tournament.startDate).getTime() - 2 * 24 * 60 * 60 * 1000);
    if (team.tournament.status !== "Upcoming" || new Date() > cancellationDeadline) {
        throw new Error("Tournament registrations can only be cancelled at least 2 days before the tournament starts.");
    }
    team.isDeleted = true;
    await team.save();
    return team;
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

    return tournament;
};

// ===================================================
// Get Tournament Groups
// ===================================================

const getTournamentGroups = async (tournamentId) => {
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

    const registrationDeadline = registrationClosesAt(tournament.startDate);
    if (tournament.status !== "Upcoming" || new Date() >= registrationDeadline) {
        throw new Error("Teams can only be added until the day before the tournament starts.");
    }

    const group = await TournamentGroup.findOne({
        _id: payload.group,
        tournament: tournamentId,
    });

    if (!group) {
        throw new Error("Invalid group for this tournament.");
    }

    const existingTeams = await TournamentTeam.countDocuments({
        tournament: tournamentId,
        group: payload.group,
        isDeleted: false,
    });

    if (existingTeams >= tournament.teamsPerGroup) {
        throw new Error(`Group ${group.name} is already full.`);
    }

    const totalRegistered = await TournamentTeam.countDocuments({
        tournament: tournamentId,
        isDeleted: false,
    });

    if (totalRegistered >= tournament.totalTeams) {
        throw new Error("All team slots are filled for this tournament.");
    }

    const { captain, players } = await validateRoster(tournament, tournamentId, payload);

    const totalPlayers = playingCount + extraCount;
    if (totalPlayers < 1) {
        throw new Error("At least one player must be added.");
    }

    const team = await TournamentTeam.create({
        tournament: tournamentId,
        group: payload.group,
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

    const registrationDeadline = registrationClosesAt(tournament.startDate);
    if (new Date() >= registrationDeadline) {
        throw new Error("Tournament registration closes the day before the tournament starts.");
    }

    const totalRegistered = await TournamentTeam.countDocuments({
        tournament: tournamentId,
        isDeleted: false,
    });

    if (totalRegistered >= tournament.totalTeams) {
        throw new Error("All team slots are filled for this tournament.");
    }

    const { captain, players } = await validateRoster(tournament, tournamentId, payload);

    const group = await assignAutomaticGroup(tournamentId, tournament.teamsPerGroup);

    const registeredCount = totalRegistered + 1;
    if (registeredCount === tournament.totalTeams) {
        const totalFixtures = tournament.groupCount * ((tournament.teamsPerGroup * (tournament.teamsPerGroup - 1)) / 2);
        const requiredDays = Math.ceil(totalFixtures / 3);
        const availableDays = Math.floor((new Date(tournament.endDate).setHours(0, 0, 0, 0) - new Date(tournament.startDate).setHours(0, 0, 0, 0)) / 86400000) + 1;
        if (requiredDays > availableDays) {
            throw new Error(`This tournament needs at least ${requiredDays} day(s) to publish all ${totalFixtures} group-stage fixtures. Extend the end date before the final registration.`);
        }
    }

    const team = await TournamentTeam.create({
        tournament: tournamentId,
        group: group._id,
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

const getTournamentTeams = async (tournamentId, groupId) => {
    const filter = { tournament: tournamentId };

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

const generateGroupMatches = async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    if (tournament.status !== "Upcoming") {
        throw new Error("Matches can only be generated for upcoming tournaments.");
    }

    const existingMatches = await TournamentMatch.countDocuments({
        tournament: tournamentId,
    });

    if (existingMatches > 0) {
        throw new Error("Matches have already been generated for this tournament.");
    }

    const groups = await TournamentGroup.find({
        tournament: tournamentId,
    }).populate("playground");

    const allTeams = await TournamentTeam.find({
        tournament: tournamentId,
    }).populate("group");

    if (allTeams.length !== tournament.totalTeams) {
        throw new Error("Not all teams have been registered yet.");
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

    for (const group of groups) {
        const groupTeams = allTeams.filter((t) => t.group._id.toString() === group._id.toString());

        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
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
                    group: group._id,
                    stage: "Group",
                    teamA: groupTeams[i]._id,
                    teamB: groupTeams[j]._id,
                    playground: group.playground._id,
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
// Get Tournament Matches
// ===================================================

const getTournamentMatches = async (tournamentId, stage) => {
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

const updateMatchResult = async (matchId, payload, actor) => {
    const match = await TournamentMatch.findById(matchId);

    if (!match) {
        throw new Error("Match not found.");
    }

    if (match.matchStatus === "Completed") {
        throw new Error("Match result has already been recorded.");
    }

    if (!Number.isInteger(payload.teamAScore) || !Number.isInteger(payload.teamBScore) || payload.teamAScore < 0 || payload.teamBScore < 0) {
        throw new Error("Both match scores must be whole numbers of zero or more.");
    }

    if (actor?.role !== "super-admin") {
        const playground = await Playground.findOne({ _id: match.playground, playgroundAdmin: actor?.userId, isDeleted: false });
        if (!playground) throw new Error("Only the tournament venue admin can update this result.");
    }

    if (match.stage !== "Group" && payload.teamAScore === payload.teamBScore) {
        throw new Error("FIFA knockout matches cannot end in a draw.");
    }

    const winnerId = payload.teamAScore === payload.teamBScore ? null : (payload.teamAScore > payload.teamBScore ? match.teamA : match.teamB);

    match.teamAScore = payload.teamAScore;
    match.teamBScore = payload.teamBScore;
    match.winner = winnerId;
    match.matchStatus = payload.matchStatus || "Completed";

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
    }

    return match;
};

// ===================================================
// Schedule Match (Admin)
// ===================================================

const scheduleMatch = async (tournamentId, matchId, payload, actor) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    const match = await TournamentMatch.findById(matchId);

    if (!match || match.tournament.toString() !== tournamentId) {
        throw new Error("Match not found.");
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
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate < tournamentStart || scheduledDate > tournamentEnd) {
        throw new Error("Match date must be within the tournament dates.");
    }
    const startTime = payload.startTime || match.startTime;
    const endTime = payload.endTime || match.endTime;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime) {
        throw new Error("Match end time must be after the kick-off time.");
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

    if (payload.stage) {
        match.stage = payload.stage;
    }

    if (payload.matchStatus) {
        match.matchStatus = payload.matchStatus;
    }

    await match.save();

    if (payload.matchStatus === "Cancelled") {
        const teams = await TournamentTeam.find({ _id: { $in: [match.teamA, match.teamB] } }).select("registeredBy teamName");
        await Promise.all(teams.filter((team) => team.registeredBy).map((team) => createNotification({
            recipient: team.registeredBy,
            type: "MatchCancelled",
            title: "Match cancelled",
            message: `${team.teamName}'s scheduled match on ${new Date(match.matchDate).toLocaleDateString("en-GB")} has been cancelled.`,
            link: "tournament.html",
        })));
    }

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

    const groups = await TournamentGroup.find({
        tournament: tournamentId,
    });

    const groupWinners = [];

    for (const group of groups) {
        const teams = await TournamentTeam.find({
            tournament: tournamentId,
            group: group._id,
        }).sort({ points: -1, goalDifference: -1, goalsFor: -1 });

        if (teams.length < 2) {
            throw new Error(`Not enough teams in ${group.name} for knockout stage.`);
        }

        groupWinners.push({ team: teams[0], group });
        groupWinners.push({ team: teams[1], group });
    }

    const playoffMatch = await TournamentMatch.create({
        tournament: tournamentId,
        stage: "Semi Final",
        teamA: groupWinners[0].team._id,
        teamB: groupWinners[1].team._id,
        playground: groupWinners[0].group.playground,
        matchDate: new Date(tournament.endDate),
        startTime: "14:00",
        endTime: "16:00",
        matchStatus: "Scheduled",
    });

    const semiFinal2 = await TournamentMatch.create({
        tournament: tournamentId,
        stage: "Semi Final",
        teamA: groupWinners[2].team._id,
        teamB: groupWinners[3].team._id,
        playground: groupWinners[2].group.playground,
        matchDate: new Date(tournament.endDate),
        startTime: "16:00",
        endTime: "18:00",
        matchStatus: "Scheduled",
    });

    const final = await TournamentMatch.create({
        tournament: tournamentId,
        stage: "Final",
        teamA: groupWinners[0].team._id,
        teamB: groupWinners[2].team._id,
        playground: groupWinners[0].group.playground,
        matchDate: new Date(tournament.endDate),
        startTime: "18:00",
        endTime: "20:00",
        matchStatus: "Scheduled",
    });

    await Tournament.findByIdAndUpdate(tournamentId, { status: "Knockout Stage" });

    return [playoffMatch, semiFinal2, final];
};

// ===================================================
// Get Tournament Standings
// ===================================================

const getTournamentStandings = async (tournamentId) => {
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

    return tournaments;
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
        if (groupCount < 2 || groupCount > 6) {
            throw new Error("Group count must be between 2 and 6.");
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
    getTournamentMatches,
    updateMatchResult,
    scheduleMatch,
    generateKnockoutStage,
    getTournamentStandings,
    getMyPlaygroundTournaments,
};
