/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : slot.validation.js
 * Purpose : Slot Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Joi = require("joi");

const createSlotValidation = Joi.object({
    playground: Joi.string().length(24).hex().required(),

    dayOfWeek: Joi.number().min(0).max(6).required(),

    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),

    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),

    durationMinutes: Joi.number().integer().min(15).max(360).default(60),

    price: Joi.number().min(0).allow(null),

    isActive: Joi.boolean(),
});

const updateSlotValidation = Joi.object({
    dayOfWeek: Joi.number().min(0).max(6),

    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),

    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),

    durationMinutes: Joi.number().integer().min(15).max(360),

    price: Joi.number().min(0).allow(null),

    isActive: Joi.boolean(),
});

const createSlotsValidation = Joi.object({
    slots: Joi.array().items(createSlotValidation).min(1).max(168).required(),
});

module.exports = {
    createSlotValidation,
    createSlotsValidation,
    updateSlotValidation,
};
