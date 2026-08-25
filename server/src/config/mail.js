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
const net = require("node:net");

// Render's SMTP route may resolve Gmail to IPv6 first, while the service has
// no IPv6 egress. Prefer IPv4 so the SMTP connection can be established.
dns.setDefaultResultOrder("ipv4first");

const getGmailIpv4Socket = (options, callback) => {
    dns.resolve4("smtp.gmail.com", (resolveError, addresses) => {
        if (resolveError || !addresses?.length) {
            callback(resolveError || new Error("No IPv4 address found for smtp.gmail.com"));
            return;
        }

        const socket = net.connect({
            host: addresses[0],
            port: options.port,
            family: 4,
        });

        const onError = (error) => callback(error);
        socket.once("connect", () => {
            socket.removeListener("error", onError);
            callback(null, { connection: socket });
        });
        socket.once("error", onError);
    });
};

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
    getSocket: getGmailIpv4Socket,
});

module.exports = transporter;
