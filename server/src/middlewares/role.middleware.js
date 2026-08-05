/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : role.middleware.js
 * Purpose : Role Based Authorization
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized Access.",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access Denied.",
            });
        }

        next();
    };
};

module.exports = authorize;