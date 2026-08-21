/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : validate.js
 * Purpose : Joi Validation Middleware
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Joi = require("joi");

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const message = error.details.map((detail) => detail.message).join(", ");

            return res.status(400).json({
                success: false,
                message,
            });
        }

        next();
    };
};

module.exports = validate;
