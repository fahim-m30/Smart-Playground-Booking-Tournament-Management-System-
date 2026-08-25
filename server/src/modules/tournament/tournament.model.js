/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournament.model.js
 * Purpose : Tournament Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
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

        matchFormat: {
            type: String,
            enum: ["Team", "Singles", "Doubles"],
            default: "Team",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // `playground` is the single official venue for a tournament.
        playground: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playground",
            required: true,
        },

        // Kept for backwards-compatible reads of older records. New records
        // always contain one item only and the app uses `playground`.
        playgrounds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Playground",
                required: true,
            },
        ],

        venueApprovalStatus: {
            type: String,
            enum: ["Not Required", "Pending", "Approved", "Rejected"],
            default: "Not Required",
        },

        venueApprovalRequestedAt: { type: Date, default: null },
        venueApprovalRespondedAt: { type: Date, default: null },

        totalTeams: {
            type: Number,
            required: true,
            min: 4,
            max: 24,
        },

        groupCount: {
            type: Number,
            default: 3,
            min: 2,
            max: 6,
        },

        teamsPerGroup: {
            type: Number,
            default: 4,
            min: 2,
            max: 8,
        },

        playingMembers: {
            type: Number,
            required: true,
            min: 1,
        },

        extraMembers: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        registrationFee: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        status: {
            type: String,
            enum: ["Pending Approval", "Upcoming", "Group Stage", "Knockout Stage", "Completed", "Cancelled"],
            default: "Upcoming",
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        startNotificationSent: {
            type: Boolean,
            default: false,
        },

        reminderSent: {
            type: Boolean,
            default: false,
        },

        cancellationProcessed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Tournament = mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;
