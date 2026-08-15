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

// ===================================================
// Get All Tournaments
// ===================================================

const getAllTournamentsController = async (req, res) => {
    try {
        const tournaments = await getAllTournaments();

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
        const groups = await getTournamentGroups(req.params.id);

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
        const team = await addTeam(req.params.id, req.body);

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
        const team = await registerTeam(req.params.id, req.body, req.user.userId);

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
        const teams = await getTournamentTeams(req.params.id, req.query.group);

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
        const matches = await getTournamentMatches(req.params.id, req.query.stage);

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
        const match = await updateMatchResult(req.params.id, req.body);

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
        const match = await scheduleMatch(req.params.id, req.params.matchId, req.body);

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
        const standings = await getTournamentStandings(req.params.id);

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
// Export Controllers
// ===================================================

module.exports = {
    createTournament: createTournamentController,
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
};
