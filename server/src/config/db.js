/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : db.js
 * Purpose : Connect MongoDB Database
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

// Older deployments created unique indexes for optional payment references.
// A tournament payment has no booking, so multiple `booking: null` records
// then caused MongoDB's E11000 duplicate-key error.  Keep these as ordinary
// lookup indexes instead; payment status is enforced by the payment service.
const repairPaymentReferenceIndexes = async () => {
    const collection = mongoose.connection.db.collection("payments");
    let indexes = [];
    try {
        indexes = await collection.indexes();
    } catch (error) {
        if (error?.code !== 26) throw error; // NamespaceNotFound: no payments yet.
    }

    for (const field of ["booking", "tournamentTeam"]) {
        const legacyIndex = indexes.find((index) => index.key?.[field] === 1 && index.unique);
        if (legacyIndex) await collection.dropIndex(legacyIndex.name);
        if (!indexes.some((index) => index.key?.[field] === 1 && !index.unique)) {
            await collection.createIndex({ [field]: 1 }, { name: `${field}_1` });
        }
    }
};

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
        await repairPaymentReferenceIndexes();

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
