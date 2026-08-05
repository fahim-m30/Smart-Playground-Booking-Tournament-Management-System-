/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : payment.controller.js
 * Purpose : Payment Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */
const {
    createPayment,
    getMyPayments,
    getSinglePayment,
} = require("./payment.service");

// ===================================================
// Create Payment
// ===================================================

const createPaymentController = async (req, res) => {
    try {
        const payment = await createPayment(
            req.body,
            req.user.userId
        );

        res.status(201).json({
            success: true,
            message: "Payment created successfully.",
            data: payment,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===================================================
// Get My Payments
// ===================================================

const getMyPaymentsController = async (
    req,
    res
) => {
    try {
        const payments = await getMyPayments(
            req.user.userId
        );

        res.status(200).json({
            success: true,
            message:
                "My payments fetched successfully.",
            data: payments,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===================================================
// Get Single Payment
// ===================================================

const getSinglePaymentController = async (
    req,
    res
) => {
    try {

        const payment =
            await getSinglePayment(
                req.params.id,
                req.user.userId
            );

        res.status(200).json({
            success: true,
            message:
                "Payment fetched successfully.",
            data: payment,
        });

    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message,
        });

    }
};
// ===================================================
// Export Controllers
// ===================================================

module.exports = {
    createPayment: createPaymentController,
    getMyPayments: getMyPaymentsController,
    getSinglePayment: getSinglePaymentController,
};