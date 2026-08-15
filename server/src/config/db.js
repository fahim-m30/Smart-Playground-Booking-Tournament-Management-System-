/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : db.js
 * Purpose : Connect MongoDB Database
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");
const dns = require("dns");

// ======================================================
// MongoDB DNS Configuration
// ======================================================

// Use public DNS servers for MongoDB Atlas SRV lookup
dns.setServers([
    "8.8.8.8",
    "1.1.1.1",
]);

// ======================================================
// Connect MongoDB
// ======================================================

const connectDB = async () => {

    const mongoURI =
        process.env.DATABASE_URL ||
        process.env.MONGO_URI;

    // ==================================================
    // Check MongoDB URI
    // ==================================================

    if (!mongoURI) {

        console.error(
            "❌ DATABASE_URL or MONGO_URI is not defined."
        );

        return false;
    }

    try {

        console.log(
            "======================================="
        );

        console.log(
            "🔄 Connecting to MongoDB..."
        );

        // ==================================================
        // MongoDB Connection
        // ==================================================

        const connection =
            await mongoose.connect(
                mongoURI,
                {
                    serverSelectionTimeoutMS: 15000,
                    connectTimeoutMS: 15000,
                }
            );

        // ==================================================
        // Success
        // ==================================================

        console.log(
            "======================================="
        );

        console.log(
            "✅ Database Connected Successfully"
        );

        console.log(
            "Database Name:",
            connection.connection.db.databaseName
        );

        console.log(
            "Host:",
            connection.connection.host
        );

        console.log(
            "======================================="
        );

        return true;

    } catch (error) {

        // ==================================================
        // Connection Error
        // ==================================================

        console.error(
            "======================================="
        );

        console.error(
            "❌ Database Connection Failed"
        );

        console.error(
            error.message
        );

        console.error(
            "======================================="
        );

        return false;
    }
};

module.exports = connectDB;