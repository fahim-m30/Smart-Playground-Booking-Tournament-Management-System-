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

console.log("✅ Routes Index Loaded");

// Auth Routes
const authRoutes = require("../modules/auth/auth.route");

// Playground Routes
const playgroundRoutes = require("../modules/playground/playground.route");

// Route Registration
router.use("/auth", authRoutes);
router.use("/playgrounds", playgroundRoutes);

module.exports = router;