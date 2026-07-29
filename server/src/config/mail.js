/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : mail.js
 * Purpose : Nodemailer Configuration
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const nodemailer = require("nodemailer");

// ===============================
// Create Mail Transporter
// ===============================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ===============================
// Verify SMTP Connection
// ===============================

transporter.verify((error, success) => {
    if (error) {
        console.log("❌ Email Server Error");
        console.log(error);
    } else {
        console.log("✅ Email Server Connected");
    }
});

module.exports = transporter;