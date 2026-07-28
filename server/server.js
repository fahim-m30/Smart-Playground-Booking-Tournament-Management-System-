/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : server.js
 * Purpose : Start the Express Server
 * Author  : Fahim Muntasir
 * ==============================================================
 */

// ===============================
// Load Environment Variables
// ===============================

require("dotenv").config();
// Avoid logging raw environment variables (may contain credentials)
// console.log(process.env.PORT);
// console.log(process.env.DATABASE_URL);

// ===============================
// Import Required Files
// ===============================

const app = require("./src/app");
const connectDB = require("./src/config/db");

// ===============================
// Server Configuration
// ===============================

const PORT = process.env.PORT || 5000;

// ===============================
// Start Server
// ===============================

const startServer = async () => {
    try {
        const dbConnected = await connectDB();

        app.listen(PORT, () => {
            console.log("=======================================");
            console.log(`🚀 Server Running on http://localhost:${PORT}`);
            if (dbConnected) console.log("✅ Database Connected Successfully");
            else console.log("⚠️  Database not connected — running in degraded mode");
            console.log("=======================================");
        });
    } catch (error) {
        console.error("❌ Failed to Start Server");
        console.error(error);
    }
};

startServer();