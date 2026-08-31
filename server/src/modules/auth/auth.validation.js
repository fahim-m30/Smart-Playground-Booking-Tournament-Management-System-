/**
 * Login request validation.
 * Client-side checks improve the experience; this schema is the authoritative
 * guard for every API caller.
 */

const Joi = require("joi");

const loginValidation = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email({ tlds: { allow: false } })
        .max(254)
        .required()
        .messages({
            "string.empty": "Enter your email address.",
            "string.email": "Enter a valid email address.",
            "any.required": "Enter your email address.",
        }),
    password: Joi.string()
        .min(6)
        .max(128)
        .required()
        .messages({
            "string.empty": "Enter your password.",
            "string.min": "Password must be at least 6 characters.",
            "any.required": "Enter your password.",
        }),
}).options({ abortEarly: false, allowUnknown: false });

module.exports = { loginValidation };
