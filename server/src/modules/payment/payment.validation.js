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
        .hex()
        .required(),

    paymentMethod: Joi.string()
        .valid(
            "SSLCommerz",
            "Stripe",
            "Cash"
        )
        .required(),
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