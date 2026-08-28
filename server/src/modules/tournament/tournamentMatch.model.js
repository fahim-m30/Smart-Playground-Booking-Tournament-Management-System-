/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournamentMatch.model.js
 * Purpose : Tournament Match Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const tournamentMatchSchema = new mongoose.Schema(
    {
        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },

        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TournamentGroup",
            default: null,
        },

        stage: {
            type: String,
            enum: ["Group", "Semi Final", "Final", "Third Place"],
            required: true,
        },

        // FIFA-style group fixtures are organised into matchdays. A team can
        // appear only once in each matchday before moving to the next round.
        matchday: {
            type: Number,
            default: null,
            min: 1,
        },

        teamA: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TournamentTeam",
            required: true,
        },

        teamB: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TournamentTeam",
            required: true,
        },

        playground: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playground",
            required: true,
        },

        matchDate: {
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

        teamAScore: {
            type: Number,
            default: null,
        },

        teamBScore: {
            type: Number,
            default: null,
        },

        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TournamentTeam",
            default: null,
        },

        matchStatus: {
            type: String,
            enum: ["Scheduled", "Live", "Completed", "Cancelled"],
            default: "Scheduled",
        },

        reminderSent: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const TournamentMatch = mongoose.model("TournamentMatch", tournamentMatchSchema);

module.exports = TournamentMatch;
