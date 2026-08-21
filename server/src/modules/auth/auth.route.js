/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.route.js
 * Purpose : Authentication Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/upload.middleware");

const authUpload = upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "nidFrontImage", maxCount: 1 },
    { name: "nidBackImage", maxCount: 1 },
]);

// Debug Logs
console.log("✅ auth.route.js Loaded");

// ===============================
// Authentication Routes
// ===============================

// Register Customer
router.post("/register", authUpload, authController.register);

// Register Playground Owner
router.post(
    "/register-playground",
    authUpload,
    authController.registerPlayground
);

// Login
router.post("/login", authController.login);

// Send Email Verification OTP
router.post("/send-otp", authController.sendEmailOTP);

// Verify Email OTP
router.post("/verify-otp", authController.verifyEmailOTP);

// Resend Email Verification OTP
router.post("/resend-otp", authController.resendEmailOTP);

// Forgot Password
router.post("/forgot-password", authController.forgotPassword);

// Reset Password
router.post("/reset-password", authController.resetPassword);

// Change Password
router.patch(
    "/change-password",
    authMiddleware,
    authController.changePassword
);

router.post("/request-sensitive-otp", authMiddleware, authController.requestSensitiveOTP);
router.patch("/change-email", authMiddleware, authController.changeEmail);

// Test Route (Remove after development)
router.get("/test", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Auth Route Working",
    });
});

// ===============================
// Export Router
// ===============================

module.exports = router;
