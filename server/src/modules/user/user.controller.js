/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.controller.js
 * Purpose : User Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const { registerUser } = require("./user.service");

// ===============================
// Register Controller
// ===============================

const register = async (req, res) => {
    try {
        console.log("========== REQUEST BODY ==========");
        console.log(req.body);

        console.log("========== REQUEST FILE ==========");
        console.log(req.file);

        const user = await registerUser(req.body, req.file);

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: user,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Get My Profile
// ===============================

const getMyProfile = async (req, res) => {
    try {
        const user = req.user;

        let profileImage = null;

        if (user.profileImage && user.profileImage.data) {
            profileImage = `data:${user.profileImage.contentType};base64,${user.profileImage.data.toString(
                "base64"
            )}`;
        }

        res.status(200).json({
            success: true,
            message: "Profile Retrieved Successfully",
            data: {
                ...user.toObject(),
                profileImage,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    register,
    getMyProfile,
};