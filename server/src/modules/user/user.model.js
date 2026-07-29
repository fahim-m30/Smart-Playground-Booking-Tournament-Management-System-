/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.model.js
 * Purpose : User Schema & Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// ===============================
// User Schema
// ===============================

const userSchema = new mongoose.Schema(
    {
        // ===============================
        // Basic Information
        // ===============================

        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

        phone: {
            type: String,
            default: null,
        },

        // ===============================
        // Profile Image
        // ===============================

        profileImage: {
            data: Buffer,
            contentType: String,
        },

        // ===============================
        // User Role
        // ===============================

        role: {
            type: String,
            enum: [
                "customer",
                "playground-admin",
                "super-admin",
            ],
            default: "customer",
        },

        // ===============================
        // Account Status
        // ===============================

        isVerified: {
            type: Boolean,
            default: false,
        },

        isBlocked: {
            type: Boolean,
            default: false,
        },

        // ===============================
        // OTP Information
        // ===============================

        otp: {
            code: {
                type: String,
                default: null,
            },
            expiresAt: {
                type: Date,
                default: null,
            },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// ===============================
// Hash Password Before Save
// ===============================

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// ===============================
// Compare Password
// ===============================

userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

// ===============================
// Export Model
// ===============================

const User = mongoose.model("User", userSchema);

module.exports = User;