/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : payment.service.js
 * Purpose : Payment Service
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Payment = require("./payment.model");
const Booking = require("../booking/booking.model");

// ===================================================
// Create Payment
// ===================================================

const createPayment = async (payload, customerId) => {

    // Find Booking
    const booking = await Booking.findOne({
        _id: payload.booking,
        customer: customerId,
        isDeleted: false,
    });

    if (!booking) {
        throw new Error("Booking not found.");
    }

    // Booking must not be cancelled
    if (booking.bookingStatus === "Cancelled") {
        throw new Error(
            "Cancelled booking cannot be paid."
        );
    }

    // Check Existing Payment
    const existingPayment = await Payment.findOne({
        booking: booking._id,
        isDeleted: false,
    });

    if (existingPayment) {
        throw new Error(
            "Payment already exists for this booking."
        );
    }

    // Create Payment
    const payment = await Payment.create({
        booking: booking._id,
        customer: customerId,
        amount: booking.totalAmount,
        paymentMethod: payload.paymentMethod,
    });

    return payment;
};
// ===================================================
// Get My Payments
// ===================================================

const getMyPayments = async (customerId) => {

    const payments = await Payment.find({
        customer: customerId,
        isDeleted: false,
    })
        .populate("booking")
        .sort({
            createdAt: -1,
        });

    return payments;
};
// ===================================================
// Get Single Payment
// ===================================================

const getSinglePayment = async (
    id,
    customerId
) => {

    const payment = await Payment.findOne({
        _id: id,
        customer: customerId,
        isDeleted: false,
    })
        .populate("booking")
        .populate(
            "customer",
            "name email phone"
        );

    if (!payment) {
        throw new Error("Payment not found.");
    }

    return payment;
};

// ===================================================
// Export Services
// ===================================================

module.exports = {
    createPayment,
    getMyPayments,
    getSinglePayment,
};