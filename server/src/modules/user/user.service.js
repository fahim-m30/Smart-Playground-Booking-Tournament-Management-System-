/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.service.js
 * Purpose : User Service
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const transporter = require("../../config/mail");
const generateOTP = require("../../utils/generateOTP");

const User = require("../user/user.model");
const { createNotification } = require("../notification/notification.service");

const convertFileToDataUrl = (file) => {
    if (!file?.buffer) return null;
    const mimeType = file.mimetype || "application/octet-stream";
    return `data:${mimeType};base64,${file.buffer.toString("base64")}`;
};

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
// Get My Profile
// ===============================

const getMyProfile = async (userId) => {
    const user = await User.findById(userId).select("-password -otp -pendingEmail");

    if (!user) {
        throw new Error("User not found.");
    }

    return user;
};

// ===============================
// Update Profile
// ===============================

const updateProfile = async (userId, payload) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    if (payload.name !== undefined) {
        const name = String(payload.name).trim();
        if (name.length < 3) throw new Error("Name must be at least 3 characters long.");
        user.name = name;
    }

    if (payload.email !== undefined && String(payload.email).trim().toLowerCase() !== user.email) {
        throw new Error("Use email verification to change your email address.");
    }

    if (payload.phone !== undefined) {
        user.phone = payload.phone;
    }

    if (payload.address !== undefined) {
        user.address = payload.address;
    }

    if (payload.gender !== undefined) {
        user.gender = payload.gender;
    }

    if (payload.dateOfBirth !== undefined) {
        user.dateOfBirth = payload.dateOfBirth || null;
    }

    await user.save();

    return getMyProfile(userId);
};

// ===============================
// Update Profile Image
// ===============================

const updateProfileImage = async (userId, file) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    const profileImage = convertFileToDataUrl(file);
    if (!profileImage) {
        throw new Error("Invalid profile image.");
    }

    user.profileImage = profileImage;

    await user.save();

    return getMyProfile(userId);
};
// ===============================
// Get All Users
// Super Admin
// ===============================

const getAllUsers = async () => {
    const users = await User.find({
        isDeleted: false,
    })
        .select("-password -otp -refreshToken")
        .sort({ createdAt: -1 });

    return users;
};

// ===============================
// Get Single User
// ===============================

const getSingleUser = async (userId) => {
    const user = await User.findOne({
        _id: userId,
        isDeleted: false,
    }).select("-password -otp -refreshToken");

    if (!user) {
        throw new Error("User not found.");
    }

    return user;
};

// ===============================
// Block User
// ===============================

const blockUser = async (userId, days = null) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    user.isBlocked = true;

    if (days && days > 0) {
        user.blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
        user.blockedUntil = null;
    }

    await user.save();

    await createNotification({
        recipient: user._id,
        type: "AccountSuspended",
        title: "Account suspended",
        message: days ? `Your account has been suspended for ${days} day(s).` : "Your account has been suspended until further notice.",
        link: "login.html",
    });

    return user;
};

// ===============================
// Unblock User
// ===============================

const unblockUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    user.isBlocked = false;
    user.blockedUntil = null;

    await user.save();

    return user;
};

// ===============================
// Soft Delete User
// ===============================

const deleteUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    user.isDeleted = true;

    await user.save();

    return;
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

    getMyProfile,
    updateProfile,
    updateProfileImage,

    getAllUsers,
    getSingleUser,
    blockUser,
    unblockUser,
    deleteUser,
};
