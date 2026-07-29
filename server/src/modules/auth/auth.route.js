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

// ===============================
// Authentication Routes
// ===============================

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

// ===============================
// Export Router
// ===============================

module.exports = router;