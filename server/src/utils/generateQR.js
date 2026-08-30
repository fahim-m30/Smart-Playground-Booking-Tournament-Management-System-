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

const generateQR = async (data) => {
    try {
        const qrData = encodeQRPayload(data);
        // Keep ticket images with the ticket record instead of the server's
        // temporary filesystem. Hosts such as Render can remove uploaded
        // files after a restart, which otherwise leaves customers with a
        // broken QR image even though their booking remains valid.
        return await QRCode.toDataURL(qrData, {
            // A larger source image remains crisp on receipts and phone
            // screens even after the browser scales it down.
            width: 600,
            margin: 3,
            errorCorrectionLevel: "M",
            color: {
                dark: "#000000",
                light: "#ffffff",
            },
        });
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

        const expiresAt = new Date(decoded.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) return { valid: false, message: "Invalid QR code format." };

        // The payment service is the source of truth for ticket eligibility:
        // it checks the live slot end-time and the team's tournament status.
        // Keeping the signed payload available here lets the scanner explain
        // an expired ticket instead of treating it as an unknown QR code.
        return { valid: true, data: decoded, tokenExpired: new Date() > expiresAt };
    } catch (error) {
        return { valid: false, message: "Invalid QR code." };
    }
};

module.exports = {
    generateQR,
    verifyQR,
};
