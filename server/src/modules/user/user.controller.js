/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.controller.js
 * Purpose : User Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */
const {
    registerUser,
    getMyProfile: getMyProfileService,
    updateProfile,
    updateProfileImage,
    getAllUsers,
    getSingleUser,
    blockUser,
    unblockUser,
    deleteUser,
} = require("./user.service");

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
        const user = await getMyProfileService(req.user._id);

        res.status(200).json({
            success: true,
            message: "Profile Retrieved Successfully",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Update My Profile
// ===============================

const updateMyProfile = async (req, res) => {
    try {
        const user = await updateProfile(
            req.user._id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            data: user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Update Profile Image
// ===============================

const updateMyProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a profile image.",
            });
        }

        const user = await updateProfileImage(
            req.user._id,
            req.file
        );

        res.status(200).json({
            success: true,
            message: "Profile image updated successfully.",
            data: user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Get All Users
// ===============================

const getUsers = async (req, res) => {
    try {
        const users = await getAllUsers();

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully.",
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Get Single User
// ===============================

const getUser = async (req, res) => {
    try {
        const user = await getSingleUser(req.params.id);

        res.status(200).json({
            success: true,
            message: "User retrieved successfully.",
            data: user,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Block User
// ===============================

const blockUserController = async (req, res) => {
    try {
        const days = req.body.days || null;
        const user = await blockUser(req.params.id, days);

        const message = days
            ? `User blocked successfully for ${days} days.`
            : "User blocked successfully.";

        res.status(200).json({
            success: true,
            message,
            data: user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Unblock User
// ===============================

const unblockUserController = async (req, res) => {
    try {
        const user = await unblockUser(req.params.id);

        res.status(200).json({
            success: true,
            message: "User unblocked successfully.",
            data: user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Delete User (Soft Delete)
// ===============================

const deleteUserController = async (req, res) => {
    try {
        await deleteUser(req.params.id);

        res.status(200).json({
            success: true,
            message: "User deleted successfully.",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
module.exports = {
    register,
    getMyProfile,
    updateMyProfile,
    updateMyProfileImage,
    getUsers,
    getUser,
    blockUserController,
    unblockUserController,
    deleteUserController,
};
