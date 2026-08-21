/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : playground.validation.js
 * Purpose : Playground Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Joi = require("joi");

// ===============================
// Create Playground Validation
// ===============================

const createPlaygroundValidation = Joi.object({
    name: Joi.string().trim().required(),

    description: Joi.string().trim().required(),

    sportType: Joi.string()
        .valid("Football", "Cricket", "Badminton")
        .required(),

    coverImage: Joi.string().allow(null, ""),

    galleryImages: Joi.array().items(Joi.string()),

    phone: Joi.string().trim().required(),

    email: Joi.string().email().required(),

    address: Joi.string().trim().required(),

    division: Joi.string().trim().required(),

    district: Joi.string().trim().required(),

    area: Joi.string().trim().required(),

    googleMapLocation: Joi.string().allow(null, ""),

    openingTime: Joi.string().required(),

    closingTime: Joi.string().required(),

    pricing: Joi.object({
        morning: Joi.number().min(0).required(),
        day: Joi.number().min(0).required(),
        evening: Joi.number().min(0).required(),
        weekend: Joi.number().min(0).required(),
    }).required(),

    maxPlayers: Joi.number().min(1).required(),

    facilities: Joi.array().items(Joi.string()),

    isFeatured: Joi.boolean(),
});

// ===============================
// Update Playground Validation
// ===============================

const updatePlaygroundValidation = Joi.object({
    name: Joi.string().trim(),

    description: Joi.string().trim(),

    sportType: Joi.string().valid(
        "Football",
        "Cricket",
        "Badminton"
    ),

    coverImage: Joi.string().allow(null, ""),

    galleryImages: Joi.array().items(Joi.string()),

    phone: Joi.string().trim(),

    email: Joi.string().email(),

    address: Joi.string().trim(),

    division: Joi.string().trim(),

    district: Joi.string().trim(),

    area: Joi.string().trim(),

    googleMapLocation: Joi.string().allow(null, ""),

    openingTime: Joi.string(),

    closingTime: Joi.string(),

    pricing: Joi.object({
        morning: Joi.number().min(0),
        day: Joi.number().min(0),
        evening: Joi.number().min(0),
        weekend: Joi.number().min(0),
    }),

    maxPlayers: Joi.number().min(1),

    facilities: Joi.array().items(Joi.string()),

    status: Joi.string().valid(
        "Active",
        "Inactive",
        "Maintenance"
    ),

    isFeatured: Joi.boolean(),
});

// ===============================
// Export
// ===============================

module.exports = {
    createPlaygroundValidation,
    updatePlaygroundValidation,
};