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

// ===============================
// Initialize Express Application
// ===============================

const app = express();

// ===============================
// Global Middlewares
// ===============================

// Allow Cross-Origin Requests
app.use(cors());

// Parse JSON Data
app.use(express.json());

// Parse URL Encoded Data
app.use(express.urlencoded({ extended: true }));

// Parse Cookies
app.use(cookieParser());

// ===============================
// Health Check Route
// ===============================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Smart Playground Booking & Tournament Management System API is Running Successfully."
    });
});

// ===============================
// Export Application
// ===============================

