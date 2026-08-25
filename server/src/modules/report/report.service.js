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
const Booking = require("../booking/booking.model");
const { createNotification } = require("../notification/notification.service");
const customerReportCategories = new Set(["Customer Misconduct", "Property Damage", "No-show or Late Arrival", "Booking or Payment Issue", "Safety Violation", "Other"]);

// ===================================================
// Create Report
// ===================================================

const createReport = async (reporterId, payload) => {
    payload.targetType = payload.targetType || "Playground";
    const reporter = await User.findById(reporterId).select("role");
    if (!reporter) throw new Error("Reporter account not found.");
    let playground = null;

    if (reporter.role === "playground-admin") {
        if (payload.targetType !== "User" || !payload.playground || !payload.reportedUser) {
            throw new Error("Choose one of your playground customers to submit a customer report.");
        }
        playground = await Playground.findOne({ _id: payload.playground, playgroundAdmin: reporterId, isDeleted: false });
        if (!playground) throw new Error("You can report customers only for your own playground.");
        const reportedCustomer = await User.findOne({ _id: payload.reportedUser, role: "customer", isDeleted: false });
        if (!reportedCustomer) throw new Error("Only customer accounts can be reported.");
        const hasBooking = await Booking.exists({
            playground: playground._id,
            customer: reportedCustomer._id,
            bookingStatus: { $in: ["Pending", "Confirmed", "Completed"] },
            isDeleted: false,
        });
        if (!hasBooking) throw new Error("You can report only customers who have booked this playground.");
        if (!customerReportCategories.has(payload.category || "Other")) {
            throw new Error("Choose a valid customer report category.");
        }
    } else if (payload.targetType === "Playground") {
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

const getReportableCustomers = async (adminId) => {
    const playgrounds = await Playground.find({ playgroundAdmin: adminId, isDeleted: false }).select("name");
    const playgroundIds = playgrounds.map((playground) => playground._id);
    if (!playgroundIds.length) return [];

    const bookings = await Booking.find({
        playground: { $in: playgroundIds },
        bookingStatus: { $in: ["Pending", "Confirmed", "Completed"] },
        isDeleted: false,
    }).populate("customer", "name email role").populate("playground", "name").sort({ createdAt: -1 });

    const seen = new Set();
    return bookings.filter((booking) => {
        const key = `${booking.customer?._id}:${booking.playground?._id}`;
        if (!booking.customer || booking.customer.role !== "customer" || seen.has(key)) return false;
        seen.add(key);
        return true;
    }).map((booking) => ({ customer: booking.customer, playground: booking.playground }));
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

const updateReportStatus = async (reportId, actor, payload) => {
    if (actor?.role !== "super-admin") {
        throw new Error("Only a super administrator can update a report status.");
    }

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

    report.reviewedBy = actor.userId;
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
    getReportableCustomers,
    getAllReports,
    getMyReports,
    getSingleReport,
    updateReportStatus,
    getPlaygroundReportsSummary,
    deleteReport,
};
