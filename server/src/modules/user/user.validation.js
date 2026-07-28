/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.validation.js
 * Purpose : User Request Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

// ===============================
// Register Validation
// ===============================

const validateRegister = (req, res, next) => {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email and password are required.",
        });
    }

    // Name validation
    if (name.trim().length < 3) {
        return res.status(400).json({
            success: false,
            message: "Name must be at least 3 characters long.",
        });
    }

    // Email validation
    const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email address.",
        });
    }

    // Password validation
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters long.",
        });
    }

    next();
};

module.exports = {
    validateRegister,
};