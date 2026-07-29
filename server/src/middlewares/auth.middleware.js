/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.middleware.js
 * Purpose : Verify JWT Token & Authenticate User
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const jwt = require("jsonwebtoken");
const User = require("../modules/user/user.model");

// ===============================
// Authentication Middleware
// ===============================

const auth = async (req, res, next) => {
    try {
        // Authorization Header
        const authorization = req.headers.authorization;

        console.log("\n========== AUTH MIDDLEWARE ==========");

        if (!authorization) {
            console.log("Authorization Header Missing");

            return res.status(401).json({
                success: false,
                message: "Unauthorized Access. Please Login First.",
            });
        }

        console.log("Authorization Header:", authorization);

        // Check Bearer Token
        if (!authorization.startsWith("Bearer ")) {
            console.log("Invalid Authorization Format");

            return res.status(401).json({
                success: false,
                message: "Invalid Authorization Format.",
            });
        }

        // Extract Token
        const token = authorization.split(" ")[1];

        console.log("Extracted Token:");
        console.log(token);

        console.log("JWT Secret:");
        console.log(process.env.JWT_ACCESS_SECRET);

        // Verify Token
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        console.log("Decoded Token:");
        console.log(decoded);

        // Find User
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            console.log("User Not Found");

            return res.status(404).json({
                success: false,
                message: "User Not Found.",
            });
        }

        if (user.isBlocked) {
            console.log("Blocked User");

            return res.status(403).json({
                success: false,
                message: "Your Account Has Been Blocked.",
            });
        }

        req.user = user;

        console.log("Authentication Successful");
        console.log("====================================\n");

        next();
    } catch (error) {
        console.log("\n========== JWT ERROR ==========");
        console.log(error);
        console.log("===============================\n");

        return res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = auth;