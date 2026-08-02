/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.service.js
 * Purpose : Authentication Service
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const transporter = require("../../config/mail");
const generateOTP = require("../../utils/generateOTP");

const User = require("../user/user.model");

// ===============================
// Login User
// ===============================

const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("Invalid Email or Password.");
    }

    const isMatched = await user.comparePassword(password);

    if (!isMatched) {
        throw new Error("Invalid Email or Password.");
    }

    if (!user.isVerified) {
        throw new Error("Please verify your email before logging in.");
    }

    if (user.isBlocked) {
        throw new Error("Your account has been blocked.");
    }

    const accessToken = jwt.sign(
        {
            userId: user._id,
            role: user.role,
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES,
        }
    );

    return {
        accessToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
};

// ===============================
// Send OTP
// ===============================

const sendOTP = async (
    email,
    subject = "Email Verification OTP"
) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found.");
    }

    const otp = generateOTP();

    const expireMinutes =
        Number(process.env.OTP_EXPIRE_MINUTES) || 10;

    user.otp = {
        code: otp,
        expiresAt: new Date(
            Date.now() + expireMinutes * 60 * 1000
        ),
    };

    await user.save();

    try {
        await transporter.sendMail({
            from: `"Smart Playground" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject,
            html: `
        <div style="max-width:600px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:10px;font-family:Arial,sans-serif;">

            <h2 style="text-align:center;color:#0F766E;">
                Smart Playground Booking & Tournament Management System
            </h2>

            <p>Hello <strong>${user.name}</strong>,</p>

            <p>
                Your One-Time Password (OTP) is:
            </p>

            <div style="text-align:center;margin:30px 0;">
                <span style="font-size:40px;font-weight:bold;letter-spacing:8px;color:#2563EB;">
                    ${otp}
                </span>
            </div>

            <p>
                This OTP is valid for
                <strong>${expireMinutes} minutes</strong>.
            </p>

            <p>
                If you did not request this,
                please ignore this email.
            </p>

            <hr>

            <p style="font-size:12px;color:#777;text-align:center;">
                © ${new Date().getFullYear()}
                Smart Playground Booking & Tournament Management System
            </p>

        </div>
        `,
        });
    } catch (error) {
        console.error("❌ Failed to send OTP email:", error);
        throw new Error(
            "OTP email could not be sent. Please verify the mail server configuration."
        );
    }

    return {
        success: true,
        message: "OTP sent successfully.",
    };
};

// ===============================
// Verify OTP
// ===============================

const verifyOTP = async ({ email, otp }) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found.");
    }

    if (!user.otp || !user.otp.code) {
        throw new Error("OTP not found.");
    }

    if (user.otp.code !== otp) {
        throw new Error("Invalid OTP.");
    }

    if (new Date() > user.otp.expiresAt) {
        throw new Error("OTP has expired.");
    }

    user.isVerified = true;

    user.otp = {
        code: null,
        expiresAt: null,
    };

    await user.save();

    return {
        success: true,
        message: "Email verified successfully.",
    };
};
// ===============================
// Forgot Password
// ===============================

const forgotPassword = async ({ email }) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found.");
    }

    await sendOTP(email, "Password Reset OTP");

    return {
        success: true,
        message: "Password reset OTP sent successfully.",
    };
};

// ===============================
// Resend OTP
// ===============================

const resendOTP = async ({ email }) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found.");
    }

    if (user.isVerified) {
        throw new Error("Email is already verified.");
    }

    await sendOTP(email, "Email Verification OTP");

    return {
        success: true,
        message: "A new OTP has been sent to your email.",
    };
};

// ===============================
// Reset Password
// ===============================

const resetPassword = async ({ email, otp, newPassword }) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found.");
    }

    if (!user.otp || !user.otp.code) {
        throw new Error("OTP not found. Please request a new OTP.");
    }

    if (user.otp.code !== otp) {
        throw new Error("Invalid OTP.");
    }

    if (new Date() > user.otp.expiresAt) {
        throw new Error("OTP has expired.");
    }

    // Password will be hashed by pre("save") middleware
    user.password = newPassword;

    // Clear OTP
    user.otp = {
        code: null,
        expiresAt: null,
    };

    await user.save();

    return {
        success: true,
        message: "Password reset successful.",
    };
};

// ===============================
// Change Password
// ===============================

const changePassword = async ({
    userId,
    currentPassword,
    newPassword,
}) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    const isMatched = await user.comparePassword(currentPassword);

    if (!isMatched) {
        throw new Error("Current password is incorrect.");
    }

    user.password = newPassword;

    await user.save();

    return {
        success: true,
        message: "Password changed successfully.",
    };
};

// ===============================
// Export Services
// ===============================

module.exports = {
    loginUser,
    sendOTP,
    verifyOTP,
    forgotPassword,
    resendOTP,
    resetPassword,
    changePassword,
};