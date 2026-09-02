/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : booking.validation.js
 * Purpose : Booking Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Joi = require("joi");

// ===============================
// Create Booking Validation
// ===============================

const createBookingValidation = Joi.object({
    playground: Joi.string().required(),

    bookingDate: Joi.date().required(),

    startTime: Joi.string().required(),

    endTime: Joi.string().required(),

    duration: Joi.number().min(1).required(),
});

// ===============================
// Update Booking Validation
// ===============================

const updateBookingValidation = Joi.object({
    bookingStatus: Joi.string().valid(
        "Pending",
        "Confirmed",
        "Cancelled",
        "Completed"
    ),

    paymentStatus: Joi.string().valid(
        "Pending",
        "Paid",
        "Refunded"
    ),

    paymentMethod: Joi.string(),

    transactionId: Joi.string(),

    otp: Joi.string(),

    otpExpiresAt: Joi.date(),

    qrCode: Joi.string(),

    isScanned: Joi.boolean(),

    cancelledAt: Joi.date(),

    cancellationReason: Joi.string().trim().max(500),

    refundAmount: Joi.number().min(0),
});

module.exports = {
    createBookingValidation,
    updateBookingValidation,
};
