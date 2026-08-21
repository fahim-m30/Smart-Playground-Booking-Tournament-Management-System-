/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : report.service.js
 * Purpose : Report Service
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Report = require("./report.model");
const Playground = require("../playground/playground.model");
const User = require("../user/user.model");
const { createNotification } = require("../notification/notification.service");

// ===================================================
// Create Report
// ===================================================

const createReport = async (reporterId, payload) => {
    payload.targetType = payload.targetType || "Playground";
    let playground = null;
    if (payload.targetType === "Playground") {
        playground = await Playground.findOne({ _id: payload.playground, isDeleted: false });
        if (!playground) throw new Error("Playground not found.");
    } else {
        const reportedUser = await User.findOne({ _id: payload.reportedUser, isDeleted: false });
        if (!reportedUser) throw new Error("Reported user not found.");
        if (reportedUser._id.toString() === String(reporterId)) throw new Error("You cannot report your own account.");
    }

    const report = await Report.create({
        reporter: reporterId,
        playground: playground?._id || null,
        reportedUser: payload.targetType === "User" ? payload.reportedUser : null,
        targetType: payload.targetType,
        subject: payload.subject,
        message: payload.message,
        category: payload.category || "Other",
        severity: payload.severity || "Medium",
    });

    return report;
};

// ===================================================
// Get All Reports (Super Admin)
// ===================================================

const getAllReports = async (query) => {
    const filter = {
        isDeleted: false,
    };

    if (query.status) {
        filter.status = query.status;
    }

    if (query.playground) {
        filter.playground = query.playground;
    }

    if (query.category) {
        filter.category = query.category;
    }

    if (query.severity) {
        filter.severity = query.severity;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const reports = await Report.find(filter)
        .populate("reporter", "name email phone")
        .populate("playground", "name address sportType")
        .populate("reportedUser", "name email role")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Report.countDocuments(filter);

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: reports,
    };
};

const getMyReports = async (reporterId) => {
    return Report.find({ reporter: reporterId, isDeleted: false })
        .populate("playground", "name address sportType")
        .populate("reportedUser", "name email role")
        .sort({ createdAt: -1 });
};

// ===================================================
// Get Single Report
// ===================================================

const getSingleReport = async (reportId, requesterId, isSuperAdmin = false) => {
    const report = await Report.findOne({
        _id: reportId,
        isDeleted: false,
    })
        .populate("reporter", "name email phone")
        .populate("playground", "name address sportType")
        .populate("reportedUser", "name email role")
        .populate("reviewedBy", "name email");

    if (!report) {
        throw new Error("Report not found.");
    }
    if (!isSuperAdmin && report.reporter._id.toString() !== String(requesterId)) throw new Error("You are not authorized to view this report.");

    return report;
};

// ===================================================
// Update Report Status (Super Admin)
// ===================================================

const updateReportStatus = async (reportId, adminId, payload) => {
    const report = await Report.findOne({
        _id: reportId,
        isDeleted: false,
    });

    if (!report) {
        throw new Error("Report not found.");
    }

    const previousStatus = report.status;
    const wasResolved = previousStatus === "Resolved";
    if (payload.status) {
        report.status = payload.status;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "adminNote")) {
        report.adminNote = payload.adminNote;
    }

    report.reviewedBy = adminId;
    report.reviewedAt = new Date();

    await report.save();

    if (previousStatus !== report.status || Object.prototype.hasOwnProperty.call(payload, "adminNote")) {
        await createNotification({
            recipient: report.reporter,
            type: "ReportUpdate",
            title: "Your issue report was updated",
            message: "Report " + report.subject + " is now " + report.status + "." + (report.adminNote ? " Review note added." : ""),
            link: "management.html?tab=Reports",
        });
    }

    let suspension = null;
    if (!wasResolved && report.status === "Resolved" && report.reportedUser) {
        const resolvedCount = await Report.countDocuments({ reportedUser: report.reportedUser, status: "Resolved", isDeleted: false });
        if (resolvedCount >= 3) {
            const days = resolvedCount >= 9 ? 7 : (resolvedCount >= 6 ? 5 : 3);
            const user = await User.findById(report.reportedUser);
            if (user && user.role !== "super-admin") {
                user.isBlocked = true;
                user.blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                await user.save();
                await createNotification({
                    recipient: user._id,
                    type: "AccountSuspended",
                    title: "Account temporarily suspended",
                    message: `Following ${resolvedCount} resolved behaviour reports, your account is suspended for ${days} day(s).`,
                    link: "dashboard.html",
                });
                suspension = { days, blockedUntil: user.blockedUntil };
            }
        }
    }

    return { report, suspension };
};

// ===================================================
// Get Playground Reports Summary
// ===================================================

const getPlaygroundReportsSummary = async (playgroundId) => {
    const playground = await Playground.findOne({
        _id: playgroundId,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    const totalReports = await Report.countDocuments({
        playground: playgroundId,
        isDeleted: false,
    });

    const pendingReports = await Report.countDocuments({
        playground: playgroundId,
        status: "Pending",
        isDeleted: false,
    });

    const resolvedReports = await Report.countDocuments({
        playground: playgroundId,
        status: "Resolved",
        isDeleted: false,
    });

    const severityBreakdown = await Report.aggregate([
        {
            $match: {
                playground: playground._id,
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: "$severity",
                count: { $sum: 1 },
            },
        },
    ]);

    const recentReports = await Report.find({
        playground: playgroundId,
        isDeleted: false,
    })
        .populate("reporter", "name email phone")
        .sort({ createdAt: -1 })
        .limit(5);

    return {
        playground: {
            id: playground._id,
            name: playground.name,
            status: playground.status,
        },
        totalReports,
        pendingReports,
        resolvedReports,
        severityBreakdown,
        recentReports,
    };
};

// ===================================================
// Delete Report (Soft Delete)
// ===================================================

const deleteReport = async (reportId) => {
    const report = await Report.findOne({
        _id: reportId,
        isDeleted: false,
    });

    if (!report) {
        throw new Error("Report not found.");
    }

    report.isDeleted = true;
    await report.save();

    return report;
};

// ===================================================
// Export Services
// ===================================================

module.exports = {
    createReport,
    getAllReports,
    getMyReports,
    getSingleReport,
    updateReportStatus,
    getPlaygroundReportsSummary,
    deleteReport,
};
