/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.model.js
 * Purpose : User Schema & Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

// ===============================
// User Schema
// ===============================

const userSchema = new mongoose.Schema(
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
            minlength: 6,
        },

        phone: {
            type: String,
            default: null,
        },

        profileImage: {
            type: String,
            default: null,
        },

        role: {
            type: String,
            enum: [
                "customer",
                "super-admin",
                "playground-admin",
            ],
            default: "customer",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isBlocked: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// ===============================
// Export Model
// ===============================

const User = mongoose.model("User", userSchema);

module.exports = User;