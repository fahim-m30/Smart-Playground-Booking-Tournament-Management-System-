/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : slot.model.js
 * Purpose : Slot Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
    {
        playground: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playground",
            required: true,
        },

        dayOfWeek: {
            type: Number,
            required: true,
            min: 0,
            max: 6,
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

        // The configuration belongs to the venue, not to an individual
        // customer booking.  Keeping this on the slot lets an admin use
        // different durations and fixed prices for different schedules.
        durationMinutes: {
            type: Number,
            required: true,
            min: 15,
            default: 60,
        },

        breakStartTime: {
            type: String,
            default: null,
        },

        breakEndTime: {
            type: String,
            default: null,
        },

        price: {
            type: Number,
            min: 0,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
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

slotSchema.index({ playground: 1, dayOfWeek: 1, startTime: 1, endTime: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

const Slot = mongoose.model("Slot", slotSchema);

module.exports = Slot;
