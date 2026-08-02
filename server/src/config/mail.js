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
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
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