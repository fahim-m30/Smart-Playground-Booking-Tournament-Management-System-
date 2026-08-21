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

// ===============================
// Import Routes
// ===============================

const authRoutes = require("../modules/auth/auth.route");
const userRoutes = require("../modules/user/user.route");
const playgroundRoutes = require("../modules/playground/playground.route");
const bookingRoutes = require("../modules/booking/booking.route");
const paymentRoutes = require("../modules/payment/payment.route");
const tournamentRoutes = require("../modules/tournament/tournament.route");
const slotRoutes = require("../modules/slot/slot.route");
const chatRoutes = require("../modules/chat/chat.route");
const reportRoutes = require("../modules/report/report.route");
const notificationRoutes = require("../modules/notification/notification.route");

// ===============================
// Register Routes
// ===============================

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/playgrounds", playgroundRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/tournaments", tournamentRoutes);
router.use("/slots", slotRoutes);
router.use("/chat", chatRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
