/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : pendingRegistration.model.js
 * Purpose : Temporary storage for pending registrations until OTP verification
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const pendingRegistrationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ["customer", "playground-admin"],
            default: "customer",
        },
        profileImage: {
            type: String,
            default: null,
        },
        nidNumber: {
            type: String,
            default: null,
            trim: true,
        },
        nidFrontImage: {
            type: String,
            default: null,
        },
        nidBackImage: {
            type: String,
            default: null,
        },
        playgroundName: {
            type: String,
            default: null,
            trim: true,
        },
        description: {
            type: String,
            default: null,
        },
        sportType: {
            type: String,
            default: null,
        },
        pricePerHour: {
            type: Number,
            default: null,
        },
        address: {
            type: String,
            default: null,
        },
        division: {
            type: String,
            default: null,
        },
        district: {
            type: String,
            default: null,
        },
        area: {
            type: String,
            default: null,
        },
        openingTime: {
            type: String,
            default: null,
        },
        closingTime: {
            type: String,
            default: null,
        },
        maxPlayers: {
            type: Number,
            default: null,
        },
        facilities: {
            type: String,
            default: null,
        },
        otp: {
            code: {
                type: String,
                default: null,
            },
            expiresAt: {
                type: Date,
                default: null,
            },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const PendingRegistration = mongoose.model(
    "PendingRegistration",
    pendingRegistrationSchema
);

module.exports = PendingRegistration;
