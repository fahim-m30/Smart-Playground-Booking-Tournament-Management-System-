/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournament.route.js
 * Purpose : Tournament Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const tournamentController = require("./tournament.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");

const router = express.Router();

// ======================================================
// Super Admin Routes
// ======================================================

// Create Tournament
router.post(
    "/",
    verifyToken,
    authorize("super-admin"),
    tournamentController.createTournament
);

// Generate Group Matches
router.post(
    "/:id/generate-matches",
    verifyToken,
    authorize("super-admin"),
    tournamentController.generateGroupMatches
);

// Generate Knockout Stage
router.post(
    "/:id/generate-knockout",
    verifyToken,
    authorize("super-admin"),
    tournamentController.generateKnockoutStage
);

// Update Match Result
router.patch(
    "/matches/:id/result",
    verifyToken,
    authorize("super-admin", "playground-admin"),
    tournamentController.updateMatchResult
);

// Schedule Match
router.patch(
    "/:id/matches/:matchId",
    verifyToken,
    authorize("super-admin", "playground-admin"),
    tournamentController.scheduleMatch
);

// ======================================================
// Public / Authenticated Routes
// ======================================================

// Get All Tournaments
router.get(
    "/",
    verifyToken,
    tournamentController.getAllTournaments
);

// Get Single Tournament
router.get(
    "/:id",
    verifyToken,
    tournamentController.getSingleTournament
);

// Get Tournament Groups
router.get(
    "/:id/groups",
    verifyToken,
    tournamentController.getTournamentGroups
);

// Add Team
router.post(
    "/:id/teams",
    verifyToken,
    authorize("super-admin", "playground-admin"),
    tournamentController.addTeam
);

// Register Team (Customer)
router.post(
    "/:id/register",
    verifyToken,
    authorize("customer"),
    tournamentController.registerTeam
);

// Get Tournament Teams
router.get(
    "/:id/teams",
    verifyToken,
    tournamentController.getTournamentTeams
);

// Get Tournament Matches
router.get(
    "/:id/matches",
    verifyToken,
    tournamentController.getTournamentMatches
);

// Get Tournament Standings
router.get(
    "/:id/standings",
    verifyToken,
    tournamentController.getTournamentStandings
);

module.exports = router;
