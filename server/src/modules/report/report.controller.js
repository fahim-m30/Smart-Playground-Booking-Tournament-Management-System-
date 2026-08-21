/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : report.controller.js
 * Purpose : Report Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const {
    createReport,
    getAllReports,
    getMyReports,
    getSingleReport,
    updateReportStatus,
    getPlaygroundReportsSummary,
    deleteReport,
} = require("./report.service");

// ===================================================
// Create Report
// ===================================================

const createReportController = async (req, res) => {
    try {
        const report = await createReport(req.user.userId, req.body);

        return res.status(201).json({
            success: true,
            message: "Report submitted successfully.",
            data: report,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get All Reports
// ===================================================

const getAllReportsController = async (req, res) => {
    try {
        const result = await getAllReports(req.query);

        return res.status(200).json({
            success: true,
            message: "Reports fetched successfully.",
            meta: result.meta,
            data: result.data,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getMyReportsController = async (req, res) => {
    try {
        const reports = await getMyReports(req.user.userId);
        return res.status(200).json({ success: true, message: "My reports fetched successfully.", data: reports });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ===================================================
// Get Single Report
// ===================================================

const getSingleReportController = async (req, res) => {
    try {
        const report = await getSingleReport(req.params.id, req.user.userId, req.user.role === "super-admin");

        return res.status(200).json({
            success: true,
            message: "Report fetched successfully.",
            data: report,
        });
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Update Report Status
// ===================================================

const updateReportStatusController = async (req, res) => {
    try {
        const result = await updateReportStatus(req.params.id, req.user.userId, req.body);

        return res.status(200).json({
            success: true,
            message: "Report updated successfully.",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Get Playground Reports Summary
// ===================================================

const getPlaygroundReportsSummaryController = async (req, res) => {
    try {
        const summary = await getPlaygroundReportsSummary(req.params.playgroundId);

        return res.status(200).json({
            success: true,
            message: "Playground reports summary fetched successfully.",
            data: summary,
        });
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Delete Report
// ===================================================

const deleteReportController = async (req, res) => {
    try {
        await deleteReport(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Report deleted successfully.",
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Export Controllers
// ===================================================

module.exports = {
    createReport: createReportController,
    getAllReports: getAllReportsController,
    getMyReports: getMyReportsController,
    getSingleReport: getSingleReportController,
    updateReportStatus: updateReportStatusController,
    getPlaygroundReportsSummary: getPlaygroundReportsSummaryController,
    deleteReport: deleteReportController,
};
