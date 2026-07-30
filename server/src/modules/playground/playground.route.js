/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : playground.route.js
 * Purpose : Playground Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const {
    createPlayground,
    getAllPlaygrounds,
    getSinglePlayground,
    getMyPlaygrounds,
    getPendingPlaygrounds,
    approvePlayground,
    rejectPlayground,
    updatePlayground,
    deletePlayground,
} = require("./playground.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");

const router = express.Router();

// ======================================================
// Public Routes
// ======================================================

// Get All Approved Playgrounds
router.get("/", getAllPlaygrounds);

// Get Single Playground
router.get("/:id", getSinglePlayground);

// ======================================================
// Protected Routes
// ======================================================

// Create Playground (Playground Admin / Super Admin)
router.post(
    "/",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    createPlayground
);

// Get My Playgrounds (Playground Admin)
router.get(
    "/my-playgrounds",
    verifyToken,
    authorize("playground-admin"),
    getMyPlaygrounds
);

// Get Pending Playgrounds (Super Admin)
router.get(
    "/pending",
    verifyToken,
    authorize("super-admin"),
    getPendingPlaygrounds
);

// Approve Playground (Super Admin)
router.patch(
    "/:id/approve",
    verifyToken,
    authorize("super-admin"),
    approvePlayground
);

// Reject Playground (Super Admin)
router.patch(
    "/:id/reject",
    verifyToken,
    authorize("super-admin"),
    rejectPlayground
);

// Update Playground (Owner / Super Admin)
router.patch(
    "/:id",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    updatePlayground
);

// Delete Playground (Owner / Super Admin)
router.delete(
    "/:id",
    verifyToken,
    authorize("playground-admin", "super-admin"),
    deletePlayground
);

module.exports = router;