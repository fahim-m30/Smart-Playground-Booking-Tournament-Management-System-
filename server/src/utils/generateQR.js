/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : generateQR.js
 * Purpose : QR Code Generation Utility
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const QR_DIR = path.join(__dirname, "../../uploads/qrcodes");

if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
}

const generateQR = async (data, fileName) => {
    try {
        const qrData = JSON.stringify(data);
        const filePath = path.join(QR_DIR, fileName);

        await QRCode.toFile(filePath, qrData, {
            width: 400,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#ffffff",
            },
        });

        return `/uploads/qrcodes/${fileName}`;
    } catch (error) {
        throw new Error("Failed to generate QR code: " + error.message);
    }
};

const verifyQR = async (qrData) => {
    try {
        const decoded = JSON.parse(qrData);

        if (!decoded.type || !decoded.id || !decoded.expiresAt) {
            return { valid: false, message: "Invalid QR code format." };
        }

        const now = new Date();
        const expiresAt = new Date(decoded.expiresAt);

        if (now > expiresAt) {
            return { valid: false, message: "QR code has expired.", expired: true };
        }

        return { valid: true, data: decoded };
    } catch (error) {
        return { valid: false, message: "Invalid QR code." };
    }
};

module.exports = {
    generateQR,
    verifyQR,
};
