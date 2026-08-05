/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : booking.route.js
 * Purpose : Booking Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const bookingController = require("./booking.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");

const router = express.Router();

// ======================================================
// Customer Routes
// ======================================================

// Create Booking
router.post(
    "/",
    verifyToken,
    authorize("customer"),
    bookingController.createBooking
);
// Get My Bookings
router.get(
    "/my-bookings",
    verifyToken,
    authorize("customer"),
    bookingController.getMyBookings
);
// Get Single Booking
router.get(
    "/:id",
    verifyToken,
    authorize("customer"),
    bookingController.getSingleBooking
);
// Cancel Booking
router.patch(
    "/:id/cancel",
    verifyToken,
    authorize("customer"),
    bookingController.cancelBooking
);

module.exports = router;