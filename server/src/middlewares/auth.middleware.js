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

        if (!authorization) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized Access. Please Login First.",
            });
        }

        // Check Bearer Token
        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid Authorization Format.",
            });
        }

        // Extract Token
        const token = authorization.split(" ")[1];

        // Verify Token
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        // Find User
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User Not Found.",
            });
        }

        if (user.isBlocked) {
            const blockedUntil = user.blockedUntil ? new Date(user.blockedUntil) : null;

            if (blockedUntil && new Date() > blockedUntil) {
                user.isBlocked = false;
                user.blockedUntil = null;
                await user.save();
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked.",
                });
            }
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = auth;
