/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : globalErrorHandler.js
 * Purpose : Global Error Handler
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const globalErrorHandler = (err, req, res, next) => {
    console.error(err);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
};

module.exports = globalErrorHandler;