/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : slot.route.js
 * Purpose : Slot Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const router = express.Router();

const slotController = require("./slot.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");
const validate = require("../../middlewares/validate");
const { createSlotValidation, createSlotsValidation, updateSlotValidation } = require("./slot.validation");

// Availability is deliberately readable without an admin token so a customer
// can see the green/white slot board before attempting a booking.
router.get("/availability", slotController.getAvailability);

// ======================================================
// Playground Admin Routes
// ======================================================

router.post(
    "/",
    verifyToken,
    authorize("playground-admin"),
    validate(createSlotValidation),
    slotController.createSlot
);

router.post(
    "/bulk",
    verifyToken,
    authorize("playground-admin"),
    validate(createSlotsValidation),
    slotController.createSlots
);

router.get(
    "/playground/:playgroundId",
    verifyToken,
    authorize("playground-admin"),
    slotController.getSlotsByPlayground
);

router.patch(
    "/:id",
    verifyToken,
    authorize("playground-admin"),
    validate(updateSlotValidation),
    slotController.updateSlot
);

router.delete(
    "/:id",
    verifyToken,
    authorize("playground-admin"),
    slotController.deleteSlot
);

module.exports = router;
