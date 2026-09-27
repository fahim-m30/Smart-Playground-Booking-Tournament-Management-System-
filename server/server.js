/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : server.js
 * Purpose : Start the Express Server
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const path = require("path");
// Resolve the environment file from this server directory so `node
// server/server.js` works the same as running npm from inside `server`.
require("dotenv").config({ path: path.join(__dirname, ".env") });


// ===============================
// Import Required Files
// ===============================

const app = require("./src/app");
const connectDB = require("./src/config/db");
const createSuperAdmin = require("./src/utils/createSuperAdmin");
const { startNotificationScheduler } = require("./src/jobs/notificationJob");
const { rescheduleUpcomingDrawsToNoon } = require("./src/modules/tournament/tournament.service");
const http = require("http");
const { initializeSocket } = require("./src/config/socket");

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

        if (dbConnected) {
            // Create Default Super Admin
            await createSuperAdmin();
            await rescheduleUpcomingDrawsToNoon();
        } else {
            throw new Error("Database connection failed. Set DATABASE_URL before deploying the API.");
        }

        const httpServer = http.createServer(app);
        initializeSocket(httpServer);
        // Render's public proxy reaches the application through this binding.
        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log("=================================");
            console.log(`TURF API listening on port ${PORT}`);

            console.log("Database connected successfully");
            startNotificationScheduler();

            console.log("=================================");
        });
    } catch (error) {
        console.error("❌ Failed to Start Server");
        console.error(error);
    }
};
startServer();
