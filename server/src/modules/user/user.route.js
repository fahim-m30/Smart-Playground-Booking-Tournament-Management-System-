/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.route.js
 * Purpose : User Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const userController = require("./user.controller");

const upload = require("../../middlewares/upload.middleware");
const auth = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const router = express.Router();



// ===================================
// Protected Routes
// ===================================

// My Profile
router.get("/me", auth, userController.getMyProfile);

// Update My Profile
router.put(
    "/me",
    auth,
    userController.updateMyProfile
);

// Update Profile Image
router.put(
    "/me/profile-image",
    auth,
    upload.single("profileImage"),
    userController.updateMyProfileImage
);

// ===================================
// Super Admin Routes
// ===================================

// Get All Users
router.get(
    "/",
    auth,
    authorize("super-admin"),
    userController.getUsers
);

// Get Single User
router.get(
    "/:id",
    auth,
    authorize("super-admin"),
    userController.getUser
);

// Block User
router.patch(
    "/block/:id",
    auth,
    authorize("super-admin"),
    userController.blockUserController
);

// Unblock User
router.patch(
    "/unblock/:id",
    auth,
    authorize("super-admin"),
    userController.unblockUserController
);

// Soft Delete User
router.delete(
    "/:id",
    auth,
    authorize("super-admin"),
    userController.deleteUserController
);
module.exports = router;