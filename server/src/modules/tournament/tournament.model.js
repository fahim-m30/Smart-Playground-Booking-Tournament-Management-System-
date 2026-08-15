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

        playgrounds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Playground",
                required: true,
            },
        ],

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
            enum: ["Upcoming", "Group Stage", "Knockout Stage", "Completed", "Cancelled"],
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
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Tournament = mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;
