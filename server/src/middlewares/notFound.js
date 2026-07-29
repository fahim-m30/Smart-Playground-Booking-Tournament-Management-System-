/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : notFound.js
 * Purpose : Handle Invalid Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route Not Found: ${req.originalUrl}`,
    });
};

module.exports = notFound;