/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.service.js
 * Purpose : Authentication Business Logic
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const jwt = require("jsonwebtoken");
const User = require("../user/user.model");

const loginUser = async ({ email, password }) => {

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("Invalid email or password.");
    }

    if (user.isBlocked) {
        throw new Error("Your account has been blocked.");
    }

    const isMatched = await user.comparePassword(password);

    if (!isMatched) {
        throw new Error("Invalid email or password.");
    }

    const accessToken = jwt.sign(
        {
            id: user._id,
            role: user.role,
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES,
        }
    );

    const userData = user.toObject();

    delete userData.password;

    return {
        accessToken,
        user: userData,
    };
};

module.exports = {
    loginUser,
};