/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.service.js
 * Purpose : User Business Logic
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const User = require("./user.model");

// ===============================
// Register User
// ===============================

const registerUser = async (userData) => {
    const { name, email, password, phone } = userData;

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error("Email already exists.");
    }

    // Create user
    const newUser = await User.create({
        name,
        email,
        password,
        phone,
    });

    // Remove password before returning response
    const user = newUser.toObject();
    delete user.password;

    return user;
};

module.exports = {
    registerUser,
};