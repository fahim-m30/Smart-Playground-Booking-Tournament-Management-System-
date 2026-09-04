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
const validate = require("../../middlewares/validate");
const upload = require("../../middlewares/upload.middleware");
const { createTournamentValidation, scheduleMatchValidation } = require("./tournament.validation");

const teamRosterUpload = upload.fields([
    { name: "captainPhoto", maxCount: 1 },
    { name: "playerPhotos", maxCount: 23 },
]);

const router = express.Router();

// ======================================================
// Super Admin Routes
// ======================================================

// Create Tournament
router.post(
    "/",
    verifyToken,
    // Customers can register a team, but only platform/venue operators can
    // publish a tournament.
    authorize("super-admin", "playground-admin"),
    validate(createTournamentValidation),
    tournamentController.createTournament
);

// The selected venue owner has to approve a super-admin's request before it
// becomes visible to customers or accepts registrations.
router.patch(
    "/:id/venue-approval",
    verifyToken,
    authorize("playground-admin"),
    tournamentController.respondToVenueApproval
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
    "/matches/:id/live-score",
    verifyToken,
    authorize("playground-admin"),
    tournamentController.updateLiveMatchScore
);

router.patch(
    "/matches/:id/result",
    verifyToken,
    authorize("playground-admin"),
    tournamentController.updateMatchResult
);

// Schedule Match
router.patch(
    "/:id/matches/:matchId",
    verifyToken,
    authorize("super-admin", "playground-admin"),
    validate(scheduleMatchValidation),
    tournamentController.scheduleMatch
);

router.patch(
    "/:id/platform-approval",
    verifyToken,
    authorize("super-admin"),
    tournamentController.respondToPlatformApproval
);

// The venue administrator runs the public group lottery one day before play.
router.post(
    "/:id/conduct-draw",
    verifyToken,
    authorize("playground-admin"),
    tournamentController.conductTournamentDraw
);

// ======================================================
// Public / Authenticated Routes
// ======================================================

// Playground-admin routes must appear before /:id so Express does not treat
// "my-playgrounds" as a tournament id.
router.get(
    "/my-playgrounds/tournaments",
    verifyToken,
    authorize("playground-admin"),
    tournamentController.getMyPlaygroundTournaments
);

router.get("/my-registrations", verifyToken, authorize("customer"), tournamentController.getMyRegistrations);
router.patch("/:id/acknowledge-draw", verifyToken, authorize("customer"), tournamentController.acknowledgeTournamentDraw);
router.patch("/:id/cancel", verifyToken, authorize("playground-admin"), tournamentController.cancelTournamentByVenueAdmin);
router.patch("/teams/:teamId/cancel", verifyToken, authorize("customer"), tournamentController.cancelRegistration);

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
    teamRosterUpload,
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

// Get Tournament Participants (for my playgrounds)
router.get(
    "/:id/participants",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    tournamentController.getTournamentParticipants
);

// Update Tournament Team Counts
router.patch(
    "/:id/team-counts",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    tournamentController.updateTournamentTeamCounts
);

// Delete Tournament
router.delete(
    "/:id",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    tournamentController.deleteTournament
);

module.exports = router;
