/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : notFound.js
 * Purpose : Handle Invalid Routes (404 Not Found)
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const notFound = (req, res, next) => {
    return res.status(404).json({
        success: false,
        message: "Route Not Found",
        error: `Cannot ${req.method} ${req.originalUrl}`,
    });
};

module.exports = notFound;