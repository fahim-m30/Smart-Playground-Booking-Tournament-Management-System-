/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.route.js
 * Purpose : User Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const userController = require("./user.controller");
const upload = require("../../middlewares/upload.middleware");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

// ===================================
// Public Routes
// ===================================

// Customer Registration (With Profile Image)
router.post(
    "/register",
    upload.single("profileImage"),
    userController.register
);

// ===================================
// Protected Routes
// ===================================

// Logged-in User Profile
router.get("/me", auth, userController.getMyProfile);

module.exports = router;