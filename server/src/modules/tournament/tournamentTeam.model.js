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

        registeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TournamentGroup",
            // A team remains unassigned while registrations are open. The
            // playground admin assigns its group only after the official draw.
            default: null,
        },

        teamName: {
            type: String,
            required: true,
            trim: true,
        },

        captain: {
            name: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            photo: { type: String, required: true },
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
                phone: {
                    type: String,
                    required: true,
                    trim: true,
                },
                photo: {
                    type: String,
                    required: true,
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

        reminderSent: {
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

// A customer account can captain/register only one active team in the same
// tournament. The service validates this first; the database index protects
// the rule even if two registration requests arrive at the same moment.
tournamentTeamSchema.index(
    { tournament: 1, registeredBy: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false, registeredBy: { $type: "objectId" } } },
);

const TournamentTeam = mongoose.model("TournamentTeam", tournamentTeamSchema);

module.exports = TournamentTeam;
