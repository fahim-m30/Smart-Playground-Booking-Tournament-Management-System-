/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : globalErrorHandler.js
 * Purpose : Global Error Handling Middleware
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const globalErrorHandler = (err, req, res, next) => {
    console.error("========== ERROR ==========");
    console.error(err);
    console.error("===========================");

    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Mongoose Validation Error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((item) => item.message)
            .join(", ");
    }

    // Duplicate Key Error
    if (err.code === 11000) {
        statusCode = 409;

        const field = Object.keys(err.keyValue)[0];

        message = `${field} already exists`;
    }

    // Invalid MongoDB ObjectId
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID";
    }

    // JWT Error
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid Token";
    }

    // JWT Expired
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token Expired";
    }

    return res.status(statusCode).json({
        success: false,
        message,
        stack:
            process.env.NODE_ENV === "development"
                ? err.stack
                : undefined,
    });
};

module.exports = globalErrorHandler;