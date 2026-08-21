/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : report.route.js
 * Purpose : Report Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const router = express.Router();

const reportController = require("./report.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");
const validate = require("../../middlewares/validate");
const { createReportValidation, updateReportStatusValidation } = require("./report.validation");

// ======================================================
// Customer Routes
// ======================================================

// Create Report
router.post(
    "/",
    verifyToken,
    authorize("customer", "playground-admin"),
    validate(createReportValidation),
    reportController.createReport
);

// Get My Reports
router.get(
    "/my-reports",
    verifyToken,
    authorize("customer", "playground-admin"),
    reportController.getMyReports
);

// Get Single Report
router.get(
    "/:id",
    verifyToken,
    authorize("customer", "playground-admin"),
    reportController.getSingleReport
);

// ======================================================
// Super Admin Routes
// ======================================================

// Get All Reports
router.get(
    "/",
    verifyToken,
    authorize("super-admin"),
    reportController.getAllReports
);

// Get Playground Reports Summary
router.get(
    "/playground/:playgroundId/summary",
    verifyToken,
    authorize("super-admin"),
    reportController.getPlaygroundReportsSummary
);

// Update Report Status
router.patch(
    "/:id/status",
    verifyToken,
    authorize("super-admin"),
    validate(updateReportStatusValidation),
    reportController.updateReportStatus
);

// Delete Report
router.delete(
    "/:id",
    verifyToken,
    authorize("super-admin"),
    reportController.deleteReport
);

module.exports = router;
