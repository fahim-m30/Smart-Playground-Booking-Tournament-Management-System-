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
const emailTemplate = require("../../utils/emailTemplate");

const User = require("../user/user.model");
const PendingRegistration = require("./pendingRegistration.model");

const convertFileToDataUrl = (file) => {
    if (!file) {
        return null;
    }

    const buffer = file.buffer || file.data;
    if (!buffer) {
        return null;
    }

    const mimeType = file.mimetype || file.contentType || "application/octet-stream";
    return `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
};

const hashPassword = async (password) => {
    return bcrypt.hash(password, 10);
};

const normalizeEmail = (email) => {
    return typeof email === "string" ? email.trim().toLowerCase() : email;
};

const isPendingExpired = (pending) => {
    return Boolean(
        pending &&
        pending.otp &&
        pending.otp.expiresAt &&
        new Date() > new Date(pending.otp.expiresAt)
    );
};

const cleanupExpiredPendingRegistration = async (email) => {
    const pending = await PendingRegistration.findOne({ email });
    if (pending && isPendingExpired(pending)) {
        await PendingRegistration.deleteOne({ _id: pending._id });
        return null;
    }
    return pending;
};

const createUserFromPendingRegistration = async (pending) => {
    const user = await User.create({
        name: pending.name,
        email: pending.email,
        password: pending.password,
        phone: pending.phone,
        role: pending.role,
        profileImage: pending.profileImage,
        nidNumber: pending.nidNumber,
        nidFrontImage: pending.nidFrontImage,
        nidBackImage: pending.nidBackImage,
    });

    return user;
};

// ===============================
// Register Customer
// ===============================
// ===============================

const registerUser = async ({
    name,
    email,
    password,
    phone,
    profileImage,
}) => {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    let existingPending = await PendingRegistration.findOne({ email: normalizedEmail });

    if (existingPending && isPendingExpired(existingPending)) {
        await PendingRegistration.deleteOne({ _id: existingPending._id });
        existingPending = null;
    }

    if (existingUser) {
        throw new Error("Email already exists.");
    }

    if (existingPending) {
        throw new Error(
            "A pending registration already exists. Please verify the OTP sent to your email or request a new one."
        );
    }

    const profileImageDataUrl = convertFileToDataUrl(profileImage);

    const pendingRegistration = await PendingRegistration.create({
        name,
        email: normalizedEmail,
        password: await hashPassword(password),
        phone,
        role: "customer",
        profileImage: profileImageDataUrl,
    });

    try {
        await sendOTP(normalizedEmail);
    } catch (error) {
        // Do not leave the email locked when the SMTP provider rejects the OTP.
        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
        throw error;
    }

    return {
        success: true,
        message:
            "Registration successful. Please verify your email using the OTP sent to your email address.",
    };
};
// ===============================
// Register Playground Owner
// ===============================

const registerPlaygroundOwner = async ({
    name,
    email,
    password,
    phone,
    profileImage,
    nidNumber,
    nidFrontImage,
    nidBackImage,

}) => {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    let existingPending = await PendingRegistration.findOne({ email: normalizedEmail });

    if (existingPending && isPendingExpired(existingPending)) {
        await PendingRegistration.deleteOne({ _id: existingPending._id });
        existingPending = null;
    }

    if (existingUser) {
        throw new Error("Email already exists.");
    }

    if (existingPending) {
        throw new Error(
            "A pending registration already exists. Please verify the OTP sent to your email or request a new one."
        );
    }

    const nidFrontImageDataUrl = convertFileToDataUrl(nidFrontImage);
    const nidBackImageDataUrl = convertFileToDataUrl(nidBackImage);
    const profileImageDataUrl = convertFileToDataUrl(profileImage);

    const pendingRegistration = await PendingRegistration.create({
        name,
        email: normalizedEmail,
        password: await hashPassword(password),
        phone,
        role: "playground-admin",
        profileImage: profileImageDataUrl,
        nidNumber,
        nidFrontImage: nidFrontImageDataUrl,
        nidBackImage: nidBackImageDataUrl,
    });

    try {
        await sendOTP(normalizedEmail);
    } catch (error) {
        // Do not leave the email locked when the SMTP provider rejects the OTP.
        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
        throw error;
    }

    return {
        success: true,
        message:
            "Playground registration submitted successfully. Please verify your email.",
    };
};

// ===============================
// Login User
// ===============================

const loginUser = async ({ email, password }) => {
    const normalizedEmail = normalizeEmail(email);

    // Find User
    const user = await User.findOne({ email: normalizedEmail });

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
        if (user.blockedUntil && new Date() >= user.blockedUntil) {
            user.isBlocked = false;
            user.blockedUntil = null;
            await user.save();
        } else {
            throw new Error("Your account is temporarily suspended.");
        }
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
    const normalizedEmail = normalizeEmail(email);
    const pending = await cleanupExpiredPendingRegistration(normalizedEmail);
    const user = await User.findOne({ email: normalizedEmail });

    const record = pending || user;
    const recordType = pending ? "pending" : user ? "user" : null;

    if (!record) {
        throw new Error("User not found.");
    }

    const otp = generateOTP();

    const expireMinutes = Number(process.env.OTP_EXPIRE_MINUTES) || 10;

    record.otp = {
        code: otp,
        expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
    };

    await record.save();

    console.log(`📧 Sending OTP to ${record.email} (${recordType})`);

    try {
        await transporter.sendMail({
            from: `"Smart Playground" <${process.env.EMAIL_USER}>`,
            to: record.email,
            subject: "Verify Your Email",
            text: `Hello ${record.name},\n\nYour OTP code is: ${otp}\nThis code is valid for ${expireMinutes} minutes.\n\nIf you did not request this, please ignore this message.\n`,
            html: emailTemplate({
                name: record.name,
                otp,
                expireMinutes,
            }),
        });
        console.log(`✅ OTP email queued for ${record.email}`);
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
// Verify Email OTP
// ===============================

const verifyOTP = async ({ email, otp }) => {
    const normalizedEmail = normalizeEmail(email);
    const pending = await PendingRegistration.findOne({ email: normalizedEmail });

    if (!pending) {
        throw new Error("Pending registration not found.");
    }

    if (!pending.otp || !pending.otp.code) {
        throw new Error("OTP not found.");
    }

    if (new Date() > pending.otp.expiresAt) {
        await PendingRegistration.deleteOne({ _id: pending._id });
        throw new Error("OTP has expired. Please register again.");
    }

    if (pending.otp.code !== otp) {
        throw new Error("Invalid OTP.");
    }

    const user = await createUserFromPendingRegistration(pending);

    await PendingRegistration.deleteOne({ email: normalizedEmail });

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
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new Error("User not found.");
    }

    await sendOTP(normalizedEmail);

    return {
        success: true,
        message: "Password reset OTP sent successfully.",
    };
};
// ===============================
// Resend Email OTP
// ===============================

const resendOTP = async ({ email }) => {
    const normalizedEmail = normalizeEmail(email);
    const pending = await cleanupExpiredPendingRegistration(normalizedEmail);
    const user = await User.findOne({ email: normalizedEmail });

    if (!pending && !user) {
        throw new Error("Email not found.");
    }

    if (!pending && user && !user.isVerified) {
        await sendOTP(normalizedEmail);
        return {
            success: true,
            message: "A new OTP has been sent to your email.",
        };
    }

    if (pending) {
        await sendOTP(normalizedEmail);
        return {
            success: true,
            message: "A new OTP has been sent to your email.",
        };
    }

    if (user.isVerified) {
        throw new Error("Email is already verified.");
    }

    await sendOTP(normalizedEmail);

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
    const normalizedEmail = normalizeEmail(email);

    // Find User
    const user = await User.findOne({ email: normalizedEmail });

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
    otp,
    newPassword,
}) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    if (!newPassword || String(newPassword).length < 6) {
        throw new Error("New password must be at least 6 characters long.");
    }
    validateSensitiveOTP(user, otp, "password-change");

    user.password = newPassword;
    clearSensitiveOTP(user);
    await user.save();

    return {
        success: true,
        message: "Password changed successfully.",
    };
};

const clearSensitiveOTP = (user) => {
    user.otp = { code: null, expiresAt: null, purpose: null };
    user.pendingEmail = null;
};

const validateSensitiveOTP = (user, otp, purpose) => {
    if (!otp || !user.otp?.code || user.otp.purpose !== purpose) {
        throw new Error("Request a new verification OTP before continuing.");
    }
    if (user.otp.code !== String(otp).trim()) throw new Error("Invalid OTP.");
    if (!user.otp.expiresAt || new Date() > user.otp.expiresAt) {
        throw new Error("OTP has expired. Please request a new one.");
    }
};

const requestSensitiveOTP = async ({ userId, action, newEmail }) => {
    if (!["password-change", "email-change"].includes(action)) {
        throw new Error("Choose a valid verification action.");
    }
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");

    let recipient = user.email;
    if (action === "email-change") {
        const normalizedEmail = normalizeEmail(newEmail);
        if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            throw new Error("Enter a valid new email address.");
        }
        if (normalizedEmail === user.email) throw new Error("Enter a different email address.");
        if (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } })) {
            throw new Error("This email address is already in use.");
        }
        user.pendingEmail = normalizedEmail;
        recipient = normalizedEmail;
    }

    const otp = generateOTP();
    const expireMinutes = Number(process.env.OTP_EXPIRE_MINUTES) || 10;
    user.otp = {
        code: otp,
        expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
        purpose: action,
    };
    await user.save();

    try {
        await transporter.sendMail({
            from: `"Smart Playground" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject: action === "email-change" ? "Verify your new email address" : "Verify your password change",
            html: emailTemplate({ name: user.name, otp, expireMinutes }),
        });
    } catch (error) {
        clearSensitiveOTP(user);
        await user.save();
        throw new Error("OTP email could not be sent. Please verify the mail server configuration.");
    }

    return { message: `Verification OTP sent to ${recipient}.` };
};

const changeEmail = async ({ userId, newEmail, otp }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");
    const normalizedEmail = normalizeEmail(newEmail);
    if (!normalizedEmail || normalizedEmail !== user.pendingEmail) {
        throw new Error("Use the same new email address that received the OTP.");
    }
    if (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } })) {
        throw new Error("This email address is already in use.");
    }
    validateSensitiveOTP(user, otp, "email-change");
    user.email = normalizedEmail;
    clearSensitiveOTP(user);
    await user.save();
    const safeUser = await User.findById(userId).select("-password -otp -pendingEmail");
    return { message: "Email address changed successfully.", user: safeUser };
};

// ===============================
// Export Services
// ===============================

module.exports = {
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
};
