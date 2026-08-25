/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : mail.js
 * Purpose : Deliver transactional email through Brevo's HTTPS API
 * ==============================================================
 */

const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sendMail = async ({ to, subject, text, html }) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
    const senderName = process.env.BREVO_SENDER_NAME || "Smart Playground";

    if (!apiKey) {
        throw new Error("BREVO_API_KEY is missing from the server environment.");
    }

    if (!senderEmail) {
        throw new Error("BREVO_SENDER_EMAIL is missing from the server environment.");
    }

    const recipient = typeof to === "string" ? { email: to } : to;
    try {
        await axios.post(
            BREVO_API_URL,
            {
                sender: {
                    name: senderName,
                    email: senderEmail,
                },
                to: [recipient],
                subject,
                textContent: text,
                htmlContent: html,
            },
            {
                headers: {
                    "api-key": apiKey,
                    "content-type": "application/json",
                },
                timeout: 15000,
            }
        );
    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new Error(`Brevo email delivery failed${status ? ` (${status})` : ""}: ${message}`);
    }
};

module.exports = { sendMail };
