/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : playground.route.js
 * Purpose : Playground Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const playgroundController = require("./playground.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");

const router = express.Router();

// ======================================================
// Public Routes
// ======================================================

// Get All Playgrounds
router.get("/", playgroundController.getAllPlaygrounds);

// ======================================================
// Protected Routes
// ======================================================

// Create Playground
router.post(
    "/",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    playgroundController.createPlayground
);

// Get My Playgrounds
router.get(
    "/my-playgrounds",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    playgroundController.getMyPlaygrounds
);

// Approve Playground
router.patch(
    "/:id/approve",
    verifyToken,
    authorize("super-admin"),
    playgroundController.approvePlayground
);

// Activate Playground
router.patch(
    "/:id/activate",
    verifyToken,
    authorize("super-admin"),
    playgroundController.activatePlayground
);

// Deactivate Playground
router.patch(
    "/:id/deactivate",
    verifyToken,
    authorize("super-admin"),
    playgroundController.deactivatePlayground
);

// Update Playground
router.patch(
    "/:id",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    playgroundController.updatePlayground
);

// Delete Playground
router.delete(
    "/:id",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    playgroundController.deletePlayground
);

// ======================================================
// Dynamic Route (Always Keep Last)
// ======================================================

// Get Single Playground
router.get("/:id", playgroundController.getSinglePlayground);

module.exports = router;