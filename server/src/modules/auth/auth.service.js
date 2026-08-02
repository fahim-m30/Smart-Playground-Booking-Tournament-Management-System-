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
const Playground = require("../playground/playground.model");

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

    if (pending.role === "playground-admin") {
        await Playground.create({
            owner: user._id,
            name: pending.playgroundName,
            slug: pending.playgroundName
                ? pending.playgroundName.toLowerCase().replace(/\s+/g, "-")
                : pending.email.split("@")[0],
            description: pending.description,
            sportType: pending.sportType,
            pricePerHour: pending.pricePerHour,
            phone: pending.phone,
            email: pending.email,
            address: pending.address,
            division: pending.division,
            district: pending.district,
            area: pending.area,
            openingTime: pending.openingTime,
            closingTime: pending.closingTime,
            maxPlayers: pending.maxPlayers,
            facilities: pending.facilities,
            status: "Pending",
        });
    }

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

    await PendingRegistration.create({
        name,
        email: normalizedEmail,
        password: await hashPassword(password),
        phone,
        role: "customer",
        profileImage: profileImageDataUrl,
    });

    await sendOTP(normalizedEmail);

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
    nidNumber,
    nidFrontImage,
    nidBackImage,

    playgroundName,
    description,
    sportType,
    pricePerHour,

    address,
    division,
    district,
    area,

    openingTime,
    closingTime,

    maxPlayers,
    facilities,
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

    await PendingRegistration.create({
        name,
        email: normalizedEmail,
        password: await hashPassword(password),
        phone,
        role: "playground-admin",
        nidNumber,
        nidFrontImage: nidFrontImageDataUrl,
        nidBackImage: nidBackImageDataUrl,
        playgroundName,
        description,
        sportType,
        pricePerHour,
        address,
        division,
        district,
        area,
        openingTime,
        closingTime,
        maxPlayers,
        facilities,
    });

    await sendOTP(normalizedEmail);

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

    console.log("User:", user);

    if (!user) {
        throw new Error("Invalid Email or Password.");
    }
console.log("=================================");
console.log("Entered Password:", password);
console.log("Password From DB:", user.password);
    // Compare Password
    const isMatched = await bcrypt.compare(password, user.password);
    console.log("Password Matched:", isMatched);
    console.log("=================================");

    console.log("Password Matched:", isMatched);

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
    registerUser,
    registerPlaygroundOwner,

    loginUser,
    sendOTP,
    verifyOTP,
    forgotPassword,
    resendOTP,
    resetPassword,
    changePassword,
};