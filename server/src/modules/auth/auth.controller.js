/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.controller.js
 * Purpose : Authentication Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const { loginUser } = require("./auth.service");

const login = async (req, res) => {

    try {

        const result = await loginUser(req.body);

        res.status(200).json({
            success: true,
            message: "Login successful.",
            data: result,
        });

    } catch (error) {

        res.status(401).json({
            success: false,
            message: error.message,
        });

    }

};

module.exports = {
    login,
};