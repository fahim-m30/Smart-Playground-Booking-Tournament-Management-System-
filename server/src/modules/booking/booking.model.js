/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : booking.model.js
 * Purpose : Booking Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        // ===============================
        // Customer
        // ===============================

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // ===============================
        // Playground
        // ===============================

        playground: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playground",
            required: true,
        },

        // ===============================
        // Booking Information
        // ===============================

        bookingDate: {
            type: Date,
            required: true,
        },

        startTime: {
            type: String,
            required: true,
            trim: true,
        },

        endTime: {
            type: String,
            required: true,
            trim: true,
        },

        duration: {
            type: Number,
            required: true,
            min: 1,
        },

        // ===============================
        // Pricing
        // ===============================

        pricePerHour: {
            type: Number,
            required: true,
        },

        totalAmount: {
            type: Number,
            required: true,
        },

        // ===============================
        // Booking Status
        // ===============================

        bookingStatus: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Cancelled",
                "Completed",
            ],
            default: "Pending",
        },

        // ===============================
        // Payment
        // ===============================

        paymentStatus: {
            type: String,
            enum: [
                "Pending",
                "Paid",
                "Refunded",
            ],
            default: "Pending",
        },

        paymentMethod: {
            type: String,
            default: null,
        },

        transactionId: {
            type: String,
            default: null,
        },

        // ===============================
        // OTP
        // ===============================

        otp: {
            type: String,
            default: null,
        },

        otpExpiresAt: {
            type: Date,
            default: null,
        },

        // ===============================
        // QR
        // ===============================

        qrCode: {
            type: String,
            default: null,
        },

        qrExpiresAt: {
            type: Date,
            default: null,
        },

        isScanned: {
            type: Boolean,
            default: false,
        },

        checkedInAt: {
            type: Date,
            default: null,
        },

        checkedInBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reminderSent: {
            type: Boolean,
            default: false,
        },

        // ===============================
        // Cancellation
        // ===============================

        cancelledAt: {
            type: Date,
            default: null,
        },

        cancellationReason: {
            type: String,
            default: null,
            trim: true,
        },

        refundAmount: {
            type: Number,
            default: 0,
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

const Booking = mongoose.model(
    "Booking",
    bookingSchema
);

module.exports = Booking;
