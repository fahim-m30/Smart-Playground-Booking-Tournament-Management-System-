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
            // Keep the local HTTP server available for static/UI development.
            // Database routes will remain unavailable, and the scheduler is
            // deliberately kept off until MongoDB can connect.
            console.warn("Database is unavailable; API data and notifications are temporarily disabled.");
        }

        const httpServer = http.createServer(app);
        initializeSocket(httpServer);
        // Bind to every network interface so Render's public proxy can reach
        // the process. Binding only to localhost makes a healthy process
        // unreachable from outside the container.
        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log("=================================");
            console.log(`🚀 Server Running on http://localhost:${PORT}`);

            if (dbConnected) {
                console.log("✅ Database Connected Successfully");
            } else {
                console.log("⚠️ Database Not Connected");
            }

            if (dbConnected) startNotificationScheduler();

            console.log("=================================");
        });
    } catch (error) {
        console.error("❌ Failed to Start Server");
        console.error(error);
    }
};
startServer();
