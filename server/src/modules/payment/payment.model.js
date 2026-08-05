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
        // Booking
        // ===============================

        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
            unique: true,
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

        paymentMethod: {
            type: String,
            enum: [
                "SSLCommerz",
                "Stripe",
                "Cash",
            ],
            default: "SSLCommerz",
        },

        transactionId: {
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