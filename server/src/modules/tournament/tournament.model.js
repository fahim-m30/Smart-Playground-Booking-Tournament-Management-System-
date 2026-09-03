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

        // Canonical form used to prevent the same event being created twice
        // with only letter-case or extra-space differences.
        nameKey: {
            type: String,
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

        // Sport-specific rules chosen by the playground admin when the
        // tournament is published. Only the field for the selected sport is
        // populated, so customers see one unambiguous match rule.
        matchRules: {
            cricketOvers: { type: Number, min: 1, max: 50, default: null },
            footballDurationMinutes: { type: Number, min: 30, max: 120, default: null },
            badmintonPointsToWin: { type: Number, min: 1, max: 30, default: null },
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

        approvalRequiredBy: {
            type: String,
            enum: ["none", "venue-admin", "super-admin"],
            default: "none",
        },

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
            max: 8,
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

        // Set only after every registered captain has been notified that the
        // final fixture list is available one day before the tournament.
        fixturesPublishedAt: {
            type: Date,
            default: null,
        },

        // The official group draw is held by the venue administrator on the
        // day before play. Registrations stay unassigned until this draw.
        drawScheduledAt: { type: Date, default: null },
        drawNotificationSent: { type: Boolean, default: false },
        drawStatus: {
            type: String,
            enum: ["Scheduled", "Preparing", "Live", "Completed"],
            default: "Scheduled",
        },
        drawStartedAt: { type: Date, default: null },
        // Progress is persisted so a participant joining an in-progress draw
        // can be shown only placements that have already been revealed.
        drawRevealIndex: { type: Number, default: 0, min: 0 },
        drawCompletedAt: { type: Date, default: null },
        // Immutable published order of the lottery, used for the participant
        // draw replay without exposing assignments before the draw completes.
        drawSequence: [{
            team: { type: mongoose.Schema.Types.ObjectId, ref: "TournamentTeam", required: true },
            group: { type: mongoose.Schema.Types.ObjectId, ref: "TournamentGroup", required: true },
        }],

        cancellationProcessed: {
            type: Boolean,
            default: false,
        },

        // Starts the fixed retention period before a cancelled tournament is
        // permanently removed with its tournament-only records.
        cancelledAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

tournamentSchema.index(
    { playground: 1, startDate: 1, nameKey: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false, nameKey: { $type: "string" } } }
);

const Tournament = mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;
