/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : app.js
 * Purpose : Configure the Express application
 * Author  : Fahim Muntasir
 * ==============================================================
 */

// ===============================
// Import Required Packages
// ===============================

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

// ===============================
// Import Routes & Middlewares
// ===============================

const routes = require("./routes");
const notFound = require("./middlewares/notFound");
const globalErrorHandler = require("./middlewares/globalErrorHandler");

// ===============================
// Initialize Express Application
// ===============================

const app = express();

const allowedOrigins = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

// ===============================
// Global Middlewares
// ===============================

// Allow Cross-Origin Requests
app.use(cors({
    origin(origin, callback) {
        // Requests without an Origin header include Render health checks and
        // non-browser clients. Browser requests must come from the deployed
        // Vercel URL configured in CLIENT_URL.
        if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("This origin is not allowed to access the API."));
    },
    credentials: true,
}));

// Parse JSON Data
app.use(express.json());

// Parse URL Encoded Data
app.use(express.urlencoded({ extended: true }));

// Parse Cookies
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ===============================
// Health Check Route
// ===============================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message:
            "Smart Playground Booking & Tournament Management System API is Running Successfully.",
    });
});

// ===============================
// API Routes
// ===============================

app.use("/api/v1", routes);

// ===============================
// Handle Invalid Routes
// ===============================

app.use(notFound);

// ===============================
// Global Error Handler
// ===============================

app.use(globalErrorHandler);

// ===============================
// Export Application
// ===============================


module.exports = app;
