/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.controller.js
 * Purpose : User Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const { registerUser } = require("./user.service");

// ===============================
// Register Controller
// ===============================

const register = async (req, res) => {
    try {
        const user = await registerUser(req.body);

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    register,
};