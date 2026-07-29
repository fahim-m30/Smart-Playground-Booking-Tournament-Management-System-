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
    // Check Email
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("Invalid Email or Password.");
    }

    // Compare Password
    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
        throw new Error("Invalid Email or Password.");
    }

    // Email Verification Check
    if (!user.isVerified) {
        throw new Error("Please verify your email before logging in.");
    }

    // Block Check
    if (user.isBlocked) {
        throw new Error("Your account has been blocked.");
    }

    // Generate JWT
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
// Send Email OTP
// ===============================

const sendOTP = async (email) => {
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

    await transporter.sendMail({
        from: `"Smart Playground" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Email Verification OTP",
        html: `
        <div style="max-width:600px;margin:auto;padding:25px;font-family:Arial,sans-serif;border:1px solid #ddd;border-radius:10px;">
            <h2 style="text-align:center;color:#0F766E;">
                Smart Playground Booking & Tournament Management System
            </h2>

            <p>Hello <strong>${user.name}</strong>,</p>

            <p>Your verification code is:</p>

            <h1 style="text-align:center;color:#2563EB;letter-spacing:8px;">
                ${otp}
            </h1>

            <p>
                This OTP will expire in
                <strong>${expireMinutes} minutes</strong>.
            </p>

            <p>
                If you did not request this verification,
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

    return {
        success: true,
        message: "OTP sent successfully.",
    };
};

// ===============================
// Verify Email OTP
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

    await sendOTP(email);

    return {
        success: true,
        message: "Password reset OTP sent successfully.",
    };
};
// ===============================
// Resend Email OTP
// ===============================

const resendOTP = async ({ email }) => {
    // Find User
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found.");
    }

    // Already Verified
    if (user.isVerified) {
        throw new Error("Email is already verified.");
    }

    // Send New OTP
    await sendOTP(email);

    return {
        success: true,
        message: "A new OTP has been sent to your email.",
    };
};

// ===============================
// Reset Password
// ===============================

const resetPassword = async ({ email, otp, newPassword }) => {
    const bcrypt = require("bcrypt");

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found.");
    }

    // OTP Exists
    if (!user.otp.code) {
        throw new Error("OTP not found. Please request a new OTP.");
    }

    // OTP Match
    if (user.otp.code !== otp) {
        throw new Error("Invalid OTP.");
    }

    // OTP Expiry
    if (user.otp.expiresAt < new Date()) {
        throw new Error("OTP has expired.");
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

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

    console.log("==================================");
    console.log("User ID:", userId);
    console.log("Current Password:", currentPassword);
    console.log("New Password:", newPassword);

    const user = await User.findById(userId);

    console.log("User Found:", user);

    if (!user) {
        throw new Error("User not found.");
    }

    console.log("Password From DB:", user.password);

    const isMatched = await user.comparePassword(currentPassword);

    console.log("Password Match:", isMatched);

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