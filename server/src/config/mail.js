/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : mail.js
 * Purpose : Nodemailer Configuration
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const nodemailer = require("nodemailer");
const dns = require("node:dns");

// Render's SMTP route may resolve Gmail to IPv6 first, while the service has
// no IPv6 egress. Prefer IPv4 so the SMTP connection can be established.
dns.setDefaultResultOrder("ipv4first");

// ===============================
// Create Mail Transporter
// ===============================

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    // STARTTLS on 587 avoids the blocked/timing-out implicit TLS route (465)
    // seen from the production host.
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
});

module.exports = transporter;
