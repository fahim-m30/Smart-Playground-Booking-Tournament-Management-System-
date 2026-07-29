/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : index.js
 * Purpose : Application Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const router = express.Router();

// Import Routes
const userRoutes = require("../modules/user/user.route");
const authRoutes = require("../modules/auth/auth.route");

// Register Routes
router.use("/users", userRoutes);
router.use("/auth", authRoutes);

module.exports = router;