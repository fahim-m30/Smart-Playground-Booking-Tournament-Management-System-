/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.validation.js
 * Purpose : Authentication Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    next();
};

module.exports = {
    validateLogin,
};