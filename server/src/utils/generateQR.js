/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : generateQR.js
 * Purpose : QR Code Generation Utility
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const QRCode = require("qrcode");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const QR_DIR = path.join(__dirname, "../../uploads/qrcodes");

if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
}

const QR_VERSION = "TURF1";

// The application already requires JWT_ACCESS_SECRET for authenticated API
// access. Reuse it only as a safe deployment fallback so tickets still work
// on existing environments; a dedicated QR_SIGNING_SECRET takes precedence.
const signingSecret = () => process.env.QR_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const encodeQRPayload = (data) => {
    const secret = signingSecret();
    if (!secret) throw new Error("QR signing is unavailable because no signing secret is configured.");

    const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
    const signature = crypto.createHmac("sha256", secret).update(`${QR_VERSION}.${payload}`).digest("base64url");
    return `${QR_VERSION}.${payload}.${signature}`;
};

const generateQR = async (data, fileName) => {
    try {
        const qrData = encodeQRPayload(data);
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

const verifyQR = (qrData) => {
    try {
        if (typeof qrData !== "string" || qrData.length > 5000) {
            return { valid: false, message: "Invalid QR code." };
        }

        const [version, payload, signature, extra] = qrData.trim().split(".");
        const secret = signingSecret();
        if (version !== QR_VERSION || !payload || !signature || extra || !secret) {
            return { valid: false, message: "This QR code is invalid or was issued by an older system." };
        }

        const expectedSignature = crypto.createHmac("sha256", secret).update(`${version}.${payload}`).digest("base64url");
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);
        if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
            return { valid: false, message: "QR code signature is invalid." };
        }

        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

        if (!decoded.type || !decoded.id || !decoded.expiresAt || !["SlotBooking", "TournamentTicket"].includes(decoded.type)) {
            return { valid: false, message: "Invalid QR code format." };
        }

        const now = new Date();
        const expiresAt = new Date(decoded.expiresAt);

        if (Number.isNaN(expiresAt.getTime()) || now > expiresAt) {
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
