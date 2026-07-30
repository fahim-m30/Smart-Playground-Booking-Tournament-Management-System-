/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : server.js
 * Purpose : Start the Express Server
 * Author  : Fahim Muntasir
 * ==============================================================
 */

require("dotenv").config();

console.log("=================================");
console.log("RUNNING FROM:", __dirname);
console.log("=================================");

// ===============================
// Import Required Files
// ===============================

const app = require("./src/app");
const connectDB = require("./src/config/db");
const createSuperAdmin = require("./src/utils/createSuperAdmin");
const User = require("./src/modules/user/user.model");

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

            // Debug: Show Users
            const users = await User.find();

            console.log("=================================");
            console.log("Total Users:", users.length);
            console.log(users);
            console.log("=================================");
        }

        app.listen(PORT, () => {
            console.log("=================================");
            console.log(`🚀 Server Running on http://localhost:${PORT}`);

            if (dbConnected) {
                console.log("✅ Database Connected Successfully");
            } else {
                console.log("⚠️ Database Not Connected");
            }

            console.log("=================================");
        });
    } catch (error) {
        console.error("❌ Failed to Start Server");
        console.error(error);
    }
};

startServer();