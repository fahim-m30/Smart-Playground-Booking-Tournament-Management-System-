/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : payment.route.js
 * Purpose : Payment Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const router = express.Router();

const paymentController = require("./payment.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");

// ======================================================
// Customer Routes
// ======================================================

// Create Payment Session
router.post(
    "/",
    verifyToken,
    authorize("customer"),
    paymentController.createPayment
);

// Get My Payments
router.get(
    "/my-payments",
    verifyToken,
    authorize("customer"),
    paymentController.getMyPayments
);

// Get Single Payment
router.get(
    "/:id",
    verifyToken,
    authorize("customer"),
    paymentController.getSinglePayment
);

// ======================================================
// Payment Callback Routes (Public - no auth)
// ======================================================

// Success
router.post(
    "/success",
    paymentController.paymentSuccess
);

// Failed
router.post(
    "/fail",
    paymentController.paymentFailed
);

// Cancelled
router.post(
    "/cancel",
    paymentController.paymentCancelled
);

// IPN
router.post(
    "/ipn",
    paymentController.paymentIPN
);

// ======================================================
// Refund
// ======================================================

router.patch(
    "/refund/:id",
    verifyToken,
    authorize(
        "super-admin",
        "playground-admin"
    ),
    paymentController.refundPayment
);

// ======================================================
// Export
// ======================================================

module.exports = router;