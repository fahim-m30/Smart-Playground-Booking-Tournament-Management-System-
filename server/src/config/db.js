/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : db.js
 * Purpose : Connect MongoDB Database
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const connectDB = async () => {
    // Prefer configured env var, fall back to common alternate name, then local default
    const mongoURI = process.env.DATABASE_URL || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/turf";

    if (!mongoURI) {
        console.error("❌ No MongoDB connection string provided. Set DATABASE_URL or MONGO_URI environment variable.");
        process.exit(1);
    }

    try {
        // Let mongoose pick appropriate defaults for the driver options
        await mongoose.connect(mongoURI);

        console.log("=======================================");
        console.log("✅ Database Connected Successfully");
        // Avoid printing credentials; show whether local or remote
        const isLocal = mongoURI.startsWith("mongodb://127.0.0.1") || mongoURI.startsWith("mongodb://localhost");
        console.log("MongoDB:", isLocal ? mongoURI : (mongoURI.includes("@") ? "<remote - credentials hidden>" : mongoURI));
        console.log("=======================================");
    } catch (error) {
        console.error("❌ Database Connection Failed");
        console.error(error && error.message ? error.message : error);
        // Do not exit the process here; allow caller to decide how to handle DB failures.
        return false;
    }

    return true;
};

module.exports = connectDB;