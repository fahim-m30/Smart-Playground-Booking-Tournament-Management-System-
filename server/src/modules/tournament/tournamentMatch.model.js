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
            enum: ["Group", "Quarter Final", "Semi Final", "Final", "Third Place"],
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

        // Cricket scorecards additionally record wickets. Football goals and
        // badminton points use the two score fields above.
        teamAWickets: { type: Number, default: null, min: 0, max: 10 },
        teamBWickets: { type: Number, default: null, min: 0, max: 10 },

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

        // A cancelled fixture remains part of the competition until it is
        // formally replayed. Keeping the announcement on the match gives
        // teams one official source for the reason and make-up schedule.
        cancellation: {
            reason: {
                type: String,
                enum: ["Weather", "Unsafe playing conditions", "Venue issue", "Power outage", "Equipment issue", "Security or emergency", "Official decision", "Other"],
                default: null,
            },
            details: { type: String, trim: true, maxlength: 500, default: null },
            announcedAt: { type: Date, default: null },
            announcedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
            originalDate: { type: Date, default: null },
            originalStartTime: { type: String, default: null },
            originalEndTime: { type: String, default: null },
            rescheduledDate: { type: Date, default: null },
            rescheduledStartTime: { type: String, default: null },
            rescheduledEndTime: { type: String, default: null },
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
