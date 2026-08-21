/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.controller.js
 * Purpose : Authentication Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const {
    registerUser,
    registerPlaygroundOwner,
    loginUser,
    sendOTP,
    verifyOTP,
    forgotPassword,
    resendOTP,
    resetPassword,
    changePassword,
    requestSensitiveOTP,
    changeEmail,
} = require("./auth.service");

// ===============================
// Register Customer
// ===============================
// ===============================
// Register Playground Owner
// ===============================

const registerPlayground = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            profileImage: req.files?.profileImage?.[0] || null,
            nidFrontImage: req.files?.nidFrontImage?.[0] || null,
            nidBackImage: req.files?.nidBackImage?.[0] || null,
        };

        const result = await registerPlaygroundOwner(payload);

        res.status(201).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const register = async (req, res) => {
    console.log("✅ Register API Hit");
    console.log(req.body);

    try {
        const payload = {
            ...req.body,
            profileImage: req.files?.profileImage?.[0] || null,
        };

        const result = await registerUser(payload);

        res.status(201).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.log(error);

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Login
// ===============================

const login = async (req, res) => {
    try {
        const result = await loginUser(req.body);

        res.status(200).json({
            success: true,
            message: "Login Successful.",
            data: result,
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Send Email OTP
// ===============================

const sendEmailOTP = async (req, res) => {
    try {
        const result = await sendOTP(req.body.email);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Verify Email OTP
// ===============================

const verifyEmailOTP = async (req, res) => {
    try {
        const result = await verifyOTP(req.body);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Forgot Password
// ===============================

const forgotPasswordController = async (req, res) => {
    try {
        const result = await forgotPassword(req.body);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Resend Email OTP
// ===============================

const resendEmailOTP = async (req, res) => {
    try {
        const result = await resendOTP(req.body);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Reset Password
// ===============================

const resetPasswordController = async (req, res) => {
    try {
        const result = await resetPassword(req.body);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/// ===============================
// Change Password
// ===============================

const changePasswordController = async (req, res) => {
    try {
        const { otp, newPassword } = req.body;

        const result = await changePassword({
            userId: req.user._id,
            otp,
            newPassword,
        });

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
const requestSensitiveOTPController = async (req, res) => {
    try {
        const result = await requestSensitiveOTP({
            userId: req.user._id,
            action: req.body.action,
            newEmail: req.body.newEmail,
        });
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const changeEmailController = async (req, res) => {
    try {
        const result = await changeEmail({
            userId: req.user._id,
            newEmail: req.body.newEmail,
            otp: req.body.otp,
        });
        res.status(200).json({ success: true, message: result.message, data: result.user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ===============================
// Export Controllers
// ===============================

module.exports = {
    register,
    registerPlayground,
    login,
    sendEmailOTP,
    verifyEmailOTP,
    forgotPassword: forgotPasswordController,
    resendEmailOTP,
    resetPassword: resetPasswordController,
    changePassword: changePasswordController,
    requestSensitiveOTP: requestSensitiveOTPController,
    changeEmail: changeEmailController,
};
