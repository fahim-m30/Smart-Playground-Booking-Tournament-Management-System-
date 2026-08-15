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

// ===================================================
// Create Tournament
// ===================================================

const createTournament = async (payload, createdBy) => {
    const playgrounds = await Playground.find({
        _id: { $in: payload.playgrounds },
        isDeleted: false,
        isApproved: true,
        status: "Active",
    });

    if (playgrounds.length !== 3) {
        throw new Error("Exactly 3 active and approved playgrounds are required.");
    }

    const totalTeams = payload.totalTeams;
    const groupCount = payload.groupCount || 3;

    if (totalTeams % groupCount !== 0) {
        throw new Error(`Total teams must be divisible by group count (${groupCount}).`);
    }

    const teamsPerGroup = Math.floor(totalTeams / groupCount);

    const tournament = await Tournament.create({
        ...payload,
        createdBy,
        groupCount,
        teamsPerGroup,
    });

    const groupNames = ["A", "B", "C", "D", "E", "F"];

    const groups = [];

    for (let i = 0; i < groupCount; i++) {
        const group = await TournamentGroup.create({
            tournament: tournament._id,
            name: `Group ${groupNames[i]}`,
            playground: playgrounds[i]._id,
        });

        groups.push(group);
    }

    await Playground.findByIdAndUpdate(playgrounds[0]._id, { $inc: { tournamentCount: 1 } });
    await Playground.findByIdAndUpdate(playgrounds[1]._id, { $inc: { tournamentCount: 1 } });
    await Playground.findByIdAndUpdate(playgrounds[2]._id, { $inc: { tournamentCount: 1 } });

    return { tournament, groups };
};

// ===================================================
// Get All Tournaments
// ===================================================

const getAllTournaments = async () => {
    const tournaments = await Tournament.find({ isDeleted: false })
        .populate("createdBy", "name email")
        .populate("playgrounds", "name address sportType")
        .sort({ createdAt: -1 });

    return tournaments;
};

// ===================================================
// Get Single Tournament
// ===================================================

const getSingleTournament = async (id) => {
    const tournament = await Tournament.findOne({
        _id: id,
        isDeleted: false,
    })
        .populate("createdBy", "name email")
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

const addTeam = async (tournamentId, payload) => {
    const tournament = await Tournament.findOne({
        _id: tournamentId,
        isDeleted: false,
    });

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    if (tournament.status !== "Upcoming") {
        throw new Error("Teams cannot be added after tournament has started.");
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
    });

    if (existingTeams >= tournament.teamsPerGroup) {
        throw new Error(`Group ${group.name} is already full.`);
    }

    const totalRegistered = await TournamentTeam.countDocuments({
        tournament: tournamentId,
    });

    if (totalRegistered >= tournament.totalTeams) {
        throw new Error("All team slots are filled for this tournament.");
    }

    const players = payload.players || [];

    const playingCount = players.filter((p) => p.isPlaying).length;
    const extraCount = players.filter((p) => !p.isPlaying).length;

    if (playingCount !== tournament.playingMembers) {
        throw new Error(
            `Exactly ${tournament.playingMembers} playing members are required.`
        );
    }

    if (extraCount > tournament.extraMembers) {
        throw new Error(
            `Maximum ${tournament.extraMembers} extra members allowed.`
        );
    }

    const totalPlayers = playingCount + extraCount;
    if (totalPlayers < 1) {
        throw new Error("At least one player must be added.");
    }

    const team = await TournamentTeam.create({
        tournament: tournamentId,
        group: payload.group,
        teamName: payload.teamName,
        captain: payload.captain || null,
        contactNumber: payload.contactNumber,
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

    if (tournament.status !== "Upcoming") {
        throw new Error("Tournament registration is closed.");
    }

    const existingTeam = await TournamentTeam.findOne({
        tournament: tournamentId,
        contactNumber: payload.contactNumber,
    });

    if (existingTeam) {
        throw new Error("You have already registered a team for this tournament.");
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
    });

    if (existingTeams >= tournament.teamsPerGroup) {
        throw new Error(`Group ${group.name} is already full.`);
    }

    const totalRegistered = await TournamentTeam.countDocuments({
        tournament: tournamentId,
    });

    if (totalRegistered >= tournament.totalTeams) {
        throw new Error("All team slots are filled for this tournament.");
    }

    const players = payload.players || [];

    const playingCount = players.filter((p) => p.isPlaying).length;
    const extraCount = players.filter((p) => !p.isPlaying).length;

    if (playingCount !== tournament.playingMembers) {
        throw new Error(
            `Exactly ${tournament.playingMembers} playing members are required.`
        );
    }

    if (extraCount > tournament.extraMembers) {
        throw new Error(
            `Maximum ${tournament.extraMembers} extra members allowed.`
        );
    }

    const team = await TournamentTeam.create({
        tournament: tournamentId,
        group: payload.group,
        teamName: payload.teamName,
        captain: payload.captain || null,
        contactNumber: payload.contactNumber,
        players: players,
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

    for (const group of groups) {
        const groupTeams = allTeams.filter((t) => t.group._id.toString() === group._id.toString());

        const groupMatchCount = (groupTeams.length * (groupTeams.length - 1)) / 2;

        let matchDate = new Date(tournament.startDate);
        let timeSlot = 0;

        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                const startHour = 10 + timeSlot * 2;
                const endHour = startHour + 2;

                const matchDateClone = new Date(matchDate);

                if (timeSlot >= 2) {
                    matchDateClone.setDate(matchDateClone.getDate() + 1);
                    timeSlot = 0;
                } else {
                    timeSlot++;
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

const updateMatchResult = async (matchId, payload) => {
    const match = await TournamentMatch.findById(matchId);

    if (!match) {
        throw new Error("Match not found.");
    }

    if (match.matchStatus === "Completed") {
        throw new Error("Match result has already been recorded.");
    }

    if (payload.teamAScore === payload.teamBScore) {
        throw new Error("FIFA knockout matches cannot end in a draw.");
    }

    const winnerId = payload.teamAScore > payload.teamBScore ? match.teamA : match.teamB;

    match.teamAScore = payload.teamAScore;
    match.teamBScore = payload.teamBScore;
    match.winner = winnerId;
    match.matchStatus = payload.matchStatus || "Completed";

    await match.save();

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

const scheduleMatch = async (tournamentId, matchId, payload) => {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    const match = await TournamentMatch.findById(matchId);

    if (!match || match.tournament.toString() !== tournamentId) {
        throw new Error("Match not found.");
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
        match.matchDate = payload.matchDate;
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
// Export Services
// ===================================================

module.exports = {
    createTournament,
    getAllTournaments,
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
};
