/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : slot.controller.js
 * Purpose : Slot Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const {
    createSlot,
    createSlots,
    getSlotsByPlayground,
    getAvailability,
    updateSlot,
    deleteSlot,
} = require("./slot.service");

// ===================================================
// Create Slot
// ===================================================

const createSlotController = async (req, res) => {
    try {
        const slot = await createSlot(req.body, req.user.userId);

        res.status(201).json({
            success: true,
            message: "Slot created successfully.",
            data: slot,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const createSlotsController = async (req, res) => {
    try {
        const slots = await createSlots(req.body, req.user.userId);
        return res.status(201).json({ success: true, message: `${slots.length} slots created successfully.`, data: slots });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const getAvailabilityController = async (req, res) => {
    try {
        const result = await getAvailability(req.query.playground, req.query.date);
        return res.status(200).json({ success: true, message: "Slot availability fetched successfully.", data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ===================================================
// Get Slots by Playground
// ===================================================

const getSlotsByPlaygroundController = async (req, res) => {
    try {
        const slots = await getSlotsByPlayground(req.params.playgroundId, req.user.userId);

        res.status(200).json({
            success: true,
            message: "Slots fetched successfully.",
            data: slots,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Update Slot
// ===================================================

const updateSlotController = async (req, res) => {
    try {
        const slot = await updateSlot(req.params.id, req.body, req.user.userId);

        res.status(200).json({
            success: true,
            message: "Slot updated successfully.",
            data: slot,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Delete Slot
// ===================================================

const deleteSlotController = async (req, res) => {
    try {
        await deleteSlot(req.params.id, req.user.userId);

        res.status(200).json({
            success: true,
            message: "Slot deleted successfully.",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Export Controllers
// ===================================================

module.exports = {
    createSlot: createSlotController,
    createSlots: createSlotsController,
    getSlotsByPlayground: getSlotsByPlaygroundController,
    getAvailability: getAvailabilityController,
    updateSlot: updateSlotController,
    deleteSlot: deleteSlotController,
};
