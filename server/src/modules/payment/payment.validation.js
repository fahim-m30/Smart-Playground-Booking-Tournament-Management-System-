/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : payment.validation.js
 * Purpose : Payment Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Joi = require("joi");

// ===================================================
// Create Payment Validation
// ===================================================

const createPaymentValidation = Joi.object({
    booking: Joi.string()
        .length(24)
        .hex(),

    tournamentTeam: Joi.string()
        .length(24)
        .hex(),

    paymentMethod: Joi.string()
        .valid(
            "Nagad",
            "bKash",
            "Rocket",
            "Card",
            "Cash"
        )
        .required(),
}).custom((value, helpers) => {
    if (!value.booking && !value.tournamentTeam) {
        return helpers.error("any.required", { message: "Either booking or tournamentTeam is required." });
    }
    return value;
});

// ===================================================
// Refund Validation
// ===================================================

const refundPaymentValidation = Joi.object({
    refundReason: Joi.string()
        .trim()
        .required(),
});

// ===================================================
// Export
// ===================================================

module.exports = {
    createPaymentValidation,
    refundPaymentValidation,
};
