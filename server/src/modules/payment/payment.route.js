/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : payment.route.js
 * Purpose : Payment Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const paymentController = require("./payment.controller");

const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");

const router = express.Router();

// ===================================================
// Create Payment
// ===================================================

router.post(
    "/",
    verifyToken,
    authorize("customer"),
    paymentController.createPayment
);
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
module.exports = router;