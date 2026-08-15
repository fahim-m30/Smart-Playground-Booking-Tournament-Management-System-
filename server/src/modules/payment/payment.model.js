/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : payment.model.js
 * Purpose : Payment Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        // ===============================
        // Reference
        // ===============================

        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            default: null,
        },

        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
            default: null,
        },

        tournamentTeam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TournamentTeam",
            default: null,
        },

        // ===============================
        // Customer
        // ===============================

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // ===============================
        // Payment Information
        // ===============================

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        paymentType: {
            type: String,
            enum: ["SlotBooking", "Tournament"],
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: [
                "Nagad",
                "bKash",
                "Card",
                "SSLCommerz",
                "Cash",
            ],
            required: true,
        },

        transactionId: {
            type: String,
            default: null,
        },

        bankTransactionId: {
            type: String,
            default: null,
        },

        validationId: {
            type: String,
            default: null,
        },

        cardType: {
            type: String,
            default: null,
        },

        cardIssuer: {
            type: String,
            default: null,
        },

        paymentStatus: {
            type: String,
            enum: [
                "Pending",
                "Paid",
                "Failed",
                "Cancelled",
                "Refunded",
            ],
            default: "Pending",
        },

        // ===============================
        // Refund
        // ===============================

        refundAmount: {
            type: Number,
            default: 0,
        },

        refundStatus: {
            type: String,
            enum: [
                "None",
                "Pending",
                "Completed",
            ],
            default: "None",
        },

        refundReason: {
            type: String,
            default: null,
        },

        // ===============================
        // Payment Time
        // ===============================

        paidAt: {
            type: Date,
            default: null,
        },

        // ===============================
        // Soft Delete
        // ===============================

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Payment = mongoose.model(
    "Payment",
    paymentSchema
);

module.exports = Payment;