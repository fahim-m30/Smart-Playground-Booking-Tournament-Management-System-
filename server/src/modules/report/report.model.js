/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : report.model.js
 * Purpose : Report Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        playground: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playground",
            default: null,
        },

        reportedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        targetType: {
            type: String,
            enum: ["Playground", "User"],
            default: "Playground",
        },

        subject: {
            type: String,
            required: true,
            trim: true,
        },

        message: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            enum: ["Cleanliness", "Maintenance", "Staff Behavior", "Facilities", "Safety", "Booking Issue", "Other"],
            default: "Other",
        },

        severity: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
        },

        status: {
            type: String,
            enum: ["Pending", "Under Review", "Resolved", "Dismissed"],
            default: "Pending",
        },

        adminNote: {
            type: String,
            default: null,
            trim: true,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
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

reportSchema.index({ reportedUser: 1, status: 1, isDeleted: 1 });

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;
