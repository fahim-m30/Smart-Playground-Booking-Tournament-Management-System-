/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournamentTeam.model.js
 * Purpose : Tournament Team Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const tournamentTeamSchema = new mongoose.Schema(
    {
        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },

        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TournamentGroup",
            required: true,
        },

        teamName: {
            type: String,
            required: true,
            trim: true,
        },

        captain: {
            type: String,
            default: null,
            trim: true,
        },

        contactNumber: {
            type: String,
            required: true,
            trim: true,
        },

        players: [
            {
                name: {
                    type: String,
                    required: true,
                    trim: true,
                },
                isPlaying: {
                    type: Boolean,
                    required: true,
                    default: true,
                },
            },
        ],

        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Refunded"],
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

        qrCode: {
            type: String,
            default: null,
        },

        qrExpiresAt: {
            type: Date,
            default: null,
        },

        played: {
            type: Number,
            default: 0,
            min: 0,
        },

        won: {
            type: Number,
            default: 0,
            min: 0,
        },

        drawn: {
            type: Number,
            default: 0,
            min: 0,
        },

        lost: {
            type: Number,
            default: 0,
            min: 0,
        },

        goalsFor: {
            type: Number,
            default: 0,
            min: 0,
        },

        goalsAgainst: {
            type: Number,
            default: 0,
            min: 0,
        },

        goalDifference: {
            type: Number,
            default: 0,
        },

        points: {
            type: Number,
            default: 0,
            min: 0,
        },

        position: {
            type: Number,
            default: 0,
        },

        isKnockedOut: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const TournamentTeam = mongoose.model("TournamentTeam", tournamentTeamSchema);

module.exports = TournamentTeam;
