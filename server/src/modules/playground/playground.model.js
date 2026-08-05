/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : playground.model.js
 * Purpose : Playground Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const playgroundSchema = new mongoose.Schema(
    {
        // ===============================
        // Playground Admin
        // ===============================

        playgroundAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // ===============================
        // Basic Information
        // ===============================

        name: {
            type: String,
            required: true,
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        sportType: {
            type: String,
            enum: ["Football", "Cricket", "Badminton"],
            required: true,
        },

        // ===============================
        // Images
        // ===============================

        coverImage: {
            type: String,
            default: null,
        },

        galleryImages: [
            {
                type: String,
            },
        ],

        // ===============================
        // Contact Information
        // ===============================

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        // ===============================
        // Address
        // ===============================

        address: {
            type: String,
            required: true,
            trim: true,
        },

        division: {
            type: String,
            required: true,
            trim: true,
        },

        district: {
            type: String,
            required: true,
            trim: true,
        },

        area: {
            type: String,
            required: true,
            trim: true,
        },

        googleMapLocation: {
            type: String,
            default: null,
        },

        // ===============================
        // Operating Time
        // ===============================

        openingTime: {
            type: String,
            required: true,
        },

        closingTime: {
            type: String,
            required: true,
        },

        // ===============================
        // Pricing
        // ===============================

        pricing: {
            morning: {
                type: Number,
                required: true,
                min: 0,
            },

            day: {
                type: Number,
                required: true,
                min: 0,
            },

            evening: {
                type: Number,
                required: true,
                min: 0,
            },

            weekend: {
                type: Number,
                required: true,
                min: 0,
            },
        },

        // ===============================
        // Playground Details
        // ===============================

        maxPlayers: {
            type: Number,
            required: true,
        },

        facilities: [
            {
                type: String,
            },
        ],

        // ===============================
        // Statistics
        // ===============================

        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        totalReviews: {
            type: Number,
            default: 0,
        },

        bookingCount: {
            type: Number,
            default: 0,
        },

        tournamentCount: {
            type: Number,
            default: 0,
        },

        // ===============================
        // Approval
        // ===============================

        isApproved: {
            type: Boolean,
            default: false,
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        // ===============================
        // Status
        // ===============================

        status: {
            type: String,
            enum: ["Active", "Inactive", "Maintenance"],
            default: "Inactive",
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },

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

const Playground = mongoose.model(
    "Playground",
    playgroundSchema
);

module.exports = Playground;