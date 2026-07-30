/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : createSuperAdmin.js
 * Purpose : Create Default Super Admin
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const User = require("../modules/user/user.model");

const createSuperAdmin = async () => {
    try {
        // Check if Super Admin already exists
        const admin = await User.findOne({
            role: "super-admin",
        });

        if (admin) {
            console.log("✅ Super Admin already exists.");
            return;
        }

        // Create Default Super Admin
        await User.create({
            name: "Fahim Muntasir",
            email: "fmuntasir488@gmail.com",
            password: "fahim123",
            phone: "01581876432",
            role: "super-admin",
            isVerified: true,
            isBlocked: false,
        });

        console.log("✅ Super Admin created successfully.");
    } catch (error) {
        console.error("❌ Failed to create Super Admin:", error.message);
    }
};

module.exports = createSuperAdmin;