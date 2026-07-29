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

        profileImage: {
            type: String,
            default: null,
        },

        role: {
            type: String,
            enum: [
                "customer",
                "super-admin",
                "playground-admin",
            ],
            default: "customer",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isBlocked: {
            type: Boolean,
            default: false,
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
    return await bcrypt.compare(plainPassword, this.password);
};

// ===============================
// Export Model
// ===============================

const User = mongoose.model("User", userSchema);

module.exports = User;