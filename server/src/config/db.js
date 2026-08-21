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
    const mongoURI =
        process.env.DATABASE_URL ||
        process.env.MONGO_URI ||
        "mongodb://127.0.0.1:27017/turf";

    if (!mongoURI) {
        console.error(
            "❌ No MongoDB connection string provided."
        );
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI);

        console.log("=======================================");
        console.log("✅ Database Connected Successfully");
        console.log("Database Name:", mongoose.connection.db.databaseName);
        console.log("Host:", mongoose.connection.host);

        const isLocal =
            mongoURI.startsWith("mongodb://127.0.0.1") ||
            mongoURI.startsWith("mongodb://localhost");

        console.log(
            "MongoDB:",
            isLocal
                ? mongoURI
                : "<remote - credentials hidden>"
        );

        console.log("=======================================");

        return true;
    } catch (error) {
        console.error("❌ Database Connection Failed");
        console.error(error.message);
        return false;
    }
};

module.exports = connectDB;