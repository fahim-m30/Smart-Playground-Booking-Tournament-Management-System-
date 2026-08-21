/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : report.validation.js
 * Purpose : Report Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Joi = require("joi");

const createReportValidation = Joi.object({
    playground: Joi.string().length(24).hex(),

    reportedUser: Joi.string().length(24).hex(),

    targetType: Joi.string().valid("Playground", "User").default("Playground"),

    subject: Joi.string().trim().min(4).max(120).required(),

    message: Joi.string().trim().min(10).max(2000).required(),

    category: Joi.string().valid(
        "Cleanliness",
        "Maintenance",
        "Staff Behavior",
        "Facilities",
        "Safety",
        "Booking Issue",
        "Other"
    ),

    severity: Joi.string().valid("Low", "Medium", "High", "Critical"),
}).custom((value, helpers) => {
    if (value.targetType === "Playground" && !value.playground) return helpers.message("A playground is required for a playground report.");
    if (value.targetType === "User" && !value.reportedUser) return helpers.message("A user is required for a behaviour report.");
    return value;
});

const updateReportStatusValidation = Joi.object({
    status: Joi.string().valid("Pending", "Under Review", "Resolved", "Dismissed"),

    adminNote: Joi.string().trim().allow("").max(1000),
});

module.exports = {
    createReportValidation,
    updateReportStatusValidation,
};
