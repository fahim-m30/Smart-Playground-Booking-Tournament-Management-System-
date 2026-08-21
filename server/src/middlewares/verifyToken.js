/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : verifyToken.js
 * Purpose : Verify JWT Access Token
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const jwt = require("jsonwebtoken");
const User = require("../modules/user/user.model");

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access.",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        const user = await User.findById(decoded.userId).select("_id role isBlocked blockedUntil isDeleted");
        if (!user || user.isDeleted) {
            return res.status(401).json({ success: false, message: "Account is no longer available." });
        }
        if (user.isBlocked) {
            if (user.blockedUntil && new Date() >= user.blockedUntil) {
                user.isBlocked = false;
                user.blockedUntil = null;
                await user.save();
            } else {
                return res.status(403).json({ success: false, message: "Your account is temporarily suspended.", blockedUntil: user.blockedUntil });
            }
        }
        req.user = { userId: user._id.toString(), role: user.role };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};

module.exports = verifyToken;
