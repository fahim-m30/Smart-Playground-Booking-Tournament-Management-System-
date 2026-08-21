/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : booking.controller.js
 * Purpose : Booking Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const {
    createBooking,
    getMyBookings,
    getSingleBooking,
    cancelBooking,
    getPlaygroundBookings,
} = require("./booking.service");

// ===================================================
// Create Booking
// ===================================================

const createBookingController = async (req, res) => {
    try {
        const booking = await createBooking(
            req.body,
            req.user.userId
        );

        res.status(201).json({
            success: true,
            message: "Booking created successfully.",
            data: booking,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get My Bookings
// ===================================================

const getMyBookingsController = async (req, res) => {
    try {
        const bookings = await getMyBookings(
            req.user.userId
        );

        res.status(200).json({
            success: true,
            message: "My bookings fetched successfully.",
            data: bookings,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Single Booking
// ===================================================

const getSingleBookingController = async (req, res) => {
    try {
        const booking = await getSingleBooking(
            req.params.id,
            req.user.userId
        );

        res.status(200).json({
            success: true,
            message: "Booking fetched successfully.",
            data: booking,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Playground Bookings
// ===================================================

const getPlaygroundBookingsController = async (req, res) => {
    try {
        const result = await getPlaygroundBookings(req.params.playgroundId, req.user.userId);

        res.status(200).json({
            success: true,
            message: "Playground bookings fetched successfully.",
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Cancel Booking
// ===================================================

const cancelBookingController = async (req, res) => {
    try {
        const booking = await cancelBooking(
            req.params.id,
            req.user.userId
        );

        res.status(200).json({
            success: true,
            message: "Booking cancelled successfully.",
            data: booking,
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
    createBooking: createBookingController,
    getMyBookings: getMyBookingsController,
    getSingleBooking: getSingleBookingController,
    getPlaygroundBookings: getPlaygroundBookingsController,
    cancelBooking: cancelBookingController,
};