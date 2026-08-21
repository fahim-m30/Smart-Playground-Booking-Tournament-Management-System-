/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : playground.controller.js
 * Purpose : Playground Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */
const {
    createPlayground,
    getAllPlaygrounds,
    getAllPlaygroundsForAdmin,
    getSinglePlayground,
    updatePlayground,
    deletePlayground,
    getMyPlaygrounds,
    approvePlayground,
    activatePlayground,
    deactivatePlayground,
} = require("./playground.service");
const fileToDataUrl = (file) => file?.buffer ? `data:${file.mimetype || "image/jpeg"};base64,${file.buffer.toString("base64")}` : null;
const withImages = (req) => ({ ...req.body, ...(typeof req.body.pricing === "string" ? { pricing: JSON.parse(req.body.pricing) } : {}), ...(typeof req.body.facilities === "string" ? { facilities: req.body.facilities.split(",").map((item) => item.trim()).filter(Boolean) } : {}), ...(req.files?.coverImage?.[0] ? { coverImage: fileToDataUrl(req.files.coverImage[0]) } : {}), ...(req.files?.galleryImages ? { galleryImages: req.files.galleryImages.map(fileToDataUrl) } : {}) });
// ===============================
// Create Playground
// ===============================

const createPlaygroundController = async (req, res) => {
    try {
        const playground = await createPlayground(
            withImages(req),
            req.user.userId
        );

        res.status(201).json({
            success: true,
            message: "Playground created successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Get All Playgrounds
// ===============================

const getAllPlaygroundsController = async (req, res) => {
    try {
        const result = await getAllPlaygrounds(req.query);

        res.status(200).json({
            success: true,
            message: "Playgrounds fetched successfully.",
            meta: result.meta,
            data: result.data,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getAllPlaygroundsForAdminController = async (req, res) => {
    try {
        const playgrounds = await getAllPlaygroundsForAdmin();
        res.status(200).json({ success: true, message: "All playgrounds fetched successfully.", data: playgrounds });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ===============================
// Get Single Playground
// ===============================

const getSinglePlaygroundController = async (req, res) => {
    try {
        const playground = await getSinglePlayground(req.params.id);

        res.status(200).json({
            success: true,
            message: "Playground fetched successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Get My Playgrounds
// ===============================

const getMyPlaygroundsController = async (req, res) => {
    try {
        const playgrounds = await getMyPlaygrounds(req.user.userId);

        res.status(200).json({
            success: true,
            message: "My playgrounds fetched successfully.",
            data: playgrounds,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Update Playground
// ===============================

const updatePlaygroundController = async (req, res) => {
    try {
        const playground = await updatePlayground(
            req.params.id,
            withImages(req),
            req.user
        );

        res.status(200).json({
            success: true,
            message: "Playground updated successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Delete Playground
// ===============================

const deletePlaygroundController = async (req, res) => {
    try {
        await deletePlayground(
            req.params.id,
            req.user
        );

        res.status(200).json({
            success: true,
            message: "Playground deleted successfully.",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Approve Playground
// ===============================

const approvePlaygroundController = async (req, res) => {
    try {
        const playground = await approvePlayground(
            req.params.id,
            req.user.userId
        );

        res.status(200).json({
            success: true,
            message: "Playground approved successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Activate Playground
// ===============================

const activatePlaygroundController = async (req, res) => {
    try {
        const playground = await activatePlayground(req.params.id);

        res.status(200).json({
            success: true,
            message: "Playground activated successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Deactivate Playground
// ===============================

const deactivatePlaygroundController = async (req, res) => {
    try {
        const playground = await deactivatePlayground(req.params.id);

        res.status(200).json({
            success: true,
            message: "Playground deactivated successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Export Controllers
// ===============================

module.exports = {
    createPlayground: createPlaygroundController,
    getAllPlaygrounds: getAllPlaygroundsController,
    getAllPlaygroundsForAdmin: getAllPlaygroundsForAdminController,
    getSinglePlayground: getSinglePlaygroundController,
    getMyPlaygrounds: getMyPlaygroundsController,
    updatePlayground: updatePlaygroundController,
    deletePlayground: deletePlaygroundController,
    approvePlayground: approvePlaygroundController,
    activatePlayground: activatePlaygroundController,
    deactivatePlayground: deactivatePlaygroundController,
};
