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

router.post(
    "/",
    verifyToken,
    authorize("customer"),
    paymentController.createPayment
);

router.post("/demo/bkash", verifyToken, authorize("customer"), paymentController.createBkashPayment);
router.post("/demo/nagad", verifyToken, authorize("customer"), paymentController.createNagadPayment);
router.post("/demo/rocket", verifyToken, authorize("customer"), paymentController.createRocketPayment);
router.post("/demo/card", verifyToken, authorize("customer"), paymentController.createCardPayment);
router.post("/demo/checkout", verifyToken, authorize("customer"), paymentController.startDemoCheckout);
router.get("/demo/checkout/:id", verifyToken, authorize("customer"), paymentController.getDemoCheckout);
router.post("/demo/checkout/:id/complete", verifyToken, authorize("customer"), paymentController.completeDemoCheckout);
router.post("/demo/checkout/:id/cancel", verifyToken, authorize("customer"), paymentController.cancelDemoCheckout);

router.get(
    "/my-payments",
    verifyToken,
    authorize("customer"),
    paymentController.getMyPayments
);

router.get(
    "/:id",
    verifyToken,
    authorize("customer"),
    paymentController.getSinglePayment
);

// ======================================================
// QR Validation (Public - no auth)
// ======================================================

router.post(
    "/verify-qr",
    paymentController.verifyQR
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
