/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournamentGroup.model.js
 * Purpose : Tournament Group Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const tournamentGroupSchema = new mongoose.Schema(
    {
        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        playground: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playground",
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const TournamentGroup = mongoose.model("TournamentGroup", tournamentGroupSchema);

module.exports = TournamentGroup;
