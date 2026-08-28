/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournament.controller.js
 * Purpose : Tournament Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const {
    createTournament,
    respondToVenueApproval,
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
    getMyPlaygroundTournaments,
    getTournamentParticipants,
    updateTournamentTeamCounts,
    deleteTournament,
    getMyRegistrations,
    cancelRegistration,
} = require("./tournament.service");

// ===================================================
// Create Tournament
// ===================================================

const createTournamentController = async (req, res) => {
    try {
        const tournament = await createTournament(req.body, req.user.userId);

        res.status(201).json({
            success: true,
            message: "Tournament created successfully.",
            data: tournament,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const respondToVenueApprovalController = async (req, res) => {
    try {
        const tournament = await respondToVenueApproval(req.params.id, req.user.userId, req.body.decision);
        return res.status(200).json({ success: true, message: `Venue request ${req.body.decision}d successfully.`, data: tournament });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ===================================================
// Get All Tournaments
// ===================================================

const getAllTournamentsController = async (req, res) => {
    try {
        const tournaments = await getAllTournaments(req.user);

        res.status(200).json({
            success: true,
            message: "Tournaments fetched successfully.",
            data: tournaments,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Single Tournament
// ===================================================

const getSingleTournamentController = async (req, res) => {
    try {
        const tournament = await getSingleTournament(req.params.id);

        res.status(200).json({
            success: true,
            message: "Tournament fetched successfully.",
            data: tournament,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Tournament Groups
// ===================================================

const getTournamentGroupsController = async (req, res) => {
    try {
        const groups = await getTournamentGroups(req.params.id, req.user);

        res.status(200).json({
            success: true,
            message: "Tournament groups fetched successfully.",
            data: groups,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Add Team
// ===================================================

const addTeamController = async (req, res) => {
    try {
        const team = await addTeam(req.params.id, req.body, req.user);

        res.status(201).json({
            success: true,
            message: "Team added successfully.",
            data: team,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Register Team (Customer)
// ===================================================

const registerTeamController = async (req, res) => {
    try {
        const captain = JSON.parse(req.body.captain || "{}");
        const players = JSON.parse(req.body.players || "[]");
        const asDataUrl = (file) => {
            if (!file?.buffer) return null;
            if (!String(file.mimetype || "").startsWith("image/")) throw new Error("Player photos must be image files.");
            if (file.size > 2 * 1024 * 1024) throw new Error("Each player photo must be 2 MB or smaller.");
            return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        };
        const captainPhoto = asDataUrl(req.files?.captainPhoto?.[0]);
        const playerPhotos = req.files?.playerPhotos || [];
        captain.photo = captainPhoto;
        const roster = players.map((player, index) => ({ ...player, photo: asDataUrl(playerPhotos[index]) }));
        const team = await registerTeam(req.params.id, {
            teamName: req.body.teamName,
            captain,
            players: roster,
        }, req.user.userId);

        res.status(201).json({
            success: true,
            message: "Team registered successfully. Please complete payment to confirm.",
            data: team,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Tournament Teams
// ===================================================

const getTournamentTeamsController = async (req, res) => {
    try {
        const teams = await getTournamentTeams(req.params.id, req.query.group, req.user);

        res.status(200).json({
            success: true,
            message: "Teams fetched successfully.",
            data: teams,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Generate Group Matches
// ===================================================

const generateGroupMatchesController = async (req, res) => {
    try {
        const matches = await generateGroupMatches(req.params.id);

        res.status(201).json({
            success: true,
            message: "Group stage matches generated successfully.",
            data: matches,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Tournament Matches
// ===================================================

const getTournamentMatchesController = async (req, res) => {
    try {
        const matches = await getTournamentMatches(req.params.id, req.query.stage, req.user);

        res.status(200).json({
            success: true,
            message: "Matches fetched successfully.",
            data: matches,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Update Match Result
// ===================================================

const updateMatchResultController = async (req, res) => {
    try {
        const match = await updateMatchResult(req.params.id, req.body, req.user);

        res.status(200).json({
            success: true,
            message: "Match result updated successfully.",
            data: match,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Schedule Match
// ===================================================

const scheduleMatchController = async (req, res) => {
    try {
        const match = await scheduleMatch(req.params.id, req.params.matchId, req.body, req.user);

        res.status(200).json({
            success: true,
            message: "Match scheduled successfully.",
            data: match,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Generate Knockout Stage
// ===================================================

const generateKnockoutStageController = async (req, res) => {
    try {
        const matches = await generateKnockoutStage(req.params.id);

        res.status(201).json({
            success: true,
            message: "Knockout stage matches generated successfully.",
            data: matches,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Tournament Standings
// ===================================================

const getTournamentStandingsController = async (req, res) => {
    try {
        const standings = await getTournamentStandings(req.params.id, req.user);

        res.status(200).json({
            success: true,
            message: "Standings fetched successfully.",
            data: standings,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get My Playground Tournaments
// ===================================================

const getMyPlaygroundTournamentsController = async (req, res) => {
    try {
        const result = await getMyPlaygroundTournaments(req.user.userId);

        res.status(200).json({
            success: true,
            message: "My playground tournaments fetched successfully.",
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Tournament Participants
// ===================================================

const getTournamentParticipantsController = async (req, res) => {
    try {
        const participants = await getTournamentParticipants(req.params.id, req.user.userId);

        res.status(200).json({
            success: true,
            message: "Tournament participants fetched successfully.",
            data: participants,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Update Tournament Team Counts
// ===================================================

const updateTournamentTeamCountsController = async (req, res) => {
    try {
        const result = await updateTournamentTeamCounts(req.params.id, req.body, req.user.userId);

        res.status(200).json({
            success: true,
            message: "Tournament team counts updated successfully.",
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Delete Tournament
// ===================================================

const deleteTournamentController = async (req, res) => {
    try {
        await deleteTournament(req.params.id, req.user.userId);

        res.status(200).json({
            success: true,
            message: "Tournament deleted successfully.",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getMyRegistrationsController = async (req, res) => {
    try {
        const registrations = await getMyRegistrations(req.user.userId);
        return res.status(200).json({ success: true, message: "Your tournament registrations fetched successfully.", data: registrations });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const cancelRegistrationController = async (req, res) => {
    try {
        await cancelRegistration(req.params.teamId, req.user.userId);
        return res.status(200).json({ success: true, message: "Tournament registration cancelled successfully." });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ===================================================
// Export Controllers
// ===================================================

module.exports = {
    createTournament: createTournamentController,
    respondToVenueApproval: respondToVenueApprovalController,
    getAllTournaments: getAllTournamentsController,
    getSingleTournament: getSingleTournamentController,
    getTournamentGroups: getTournamentGroupsController,
    addTeam: addTeamController,
    registerTeam: registerTeamController,
    getTournamentTeams: getTournamentTeamsController,
    generateGroupMatches: generateGroupMatchesController,
    getTournamentMatches: getTournamentMatchesController,
    updateMatchResult: updateMatchResultController,
    scheduleMatch: scheduleMatchController,
    generateKnockoutStage: generateKnockoutStageController,
    getTournamentStandings: getTournamentStandingsController,
    getMyPlaygroundTournaments: getMyPlaygroundTournamentsController,
    getTournamentParticipants: getTournamentParticipantsController,
    updateTournamentTeamCounts: updateTournamentTeamCountsController,
    deleteTournament: deleteTournamentController,
    getMyRegistrations: getMyRegistrationsController,
    cancelRegistration: cancelRegistrationController,
};
