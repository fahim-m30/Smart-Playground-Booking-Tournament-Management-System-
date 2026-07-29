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

const auth = async (req, res, next) => {
    try {
        // ===============================
        // Check Authorization Header
        // ===============================
        const authorization = req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized Access. Please Login First.",
            });
        }

        // ===============================
        // Extract Bearer Token
        // ===============================
        const token = authorization.startsWith("Bearer ")
            ? authorization.split(" ")[1]
            : authorization;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token Not Found.",
            });
        }

        // ===============================
        // Verify JWT Token
        // ===============================
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        // ===============================
        // Find User
        // ===============================
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User Not Found.",
            });
        }

        // ===============================
        // Check Blocked User
        // ===============================
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your Account Has Been Blocked.",
            });
        }

        // ===============================
        // Attach User to Request
        // ===============================
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or Expired Token.",
        });
    }
};

module.exports = auth;