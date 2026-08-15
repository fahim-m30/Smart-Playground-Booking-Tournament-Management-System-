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

    paymentSuccess,

    paymentFailed,

    paymentCancelled,

    paymentIPN,

    refundPayment,

} = require("./payment.service");

// ===================================================
// Create Payment
// ===================================================

const createPaymentController = async (
    req,
    res
) => {

    try {

        const result =
            await createPayment(
                req.body,
                req.user.userId
            );

        return res.status(201).json({

            success: true,

            message:
                "Payment session created successfully.",

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
// Get My Payments
// ===================================================

const getMyPaymentsController = async (
    req,
    res
) => {

    try {

        const result =
            await getMyPayments(
                req.user.userId
            );

        return res.status(200).json({

            success: true,

            message:
                "Payments fetched successfully.",

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
// Get Single Payment
// ===================================================

const getSinglePaymentController = async (
    req,
    res
) => {

    try {

        const result =
            await getSinglePayment(
                req.params.id,
                req.user.userId
            );

        return res.status(200).json({

            success: true,

            message:
                "Payment fetched successfully.",

            data: result,

        });

    } catch (error) {

        return res.status(404).json({

            success: false,

            message: error.message,

        });

    }

};

// ===================================================
// Payment Success
// ===================================================

const paymentSuccessController = async (
    req,
    res
) => {

    try {

        await paymentSuccess(
            req.body
        );

        return res.redirect(
            "http://localhost:5500/payment-success.html"
        );

    } catch (error) {

        return res.status(400).json({

            success: false,

            message: error.message,

        });

    }

};

// ===================================================
// Payment Failed
// ===================================================

const paymentFailedController = async (
    req,
    res
) => {

    try {

        await paymentFailed(
            req.body
        );

        return res.redirect(
            "http://localhost:5500/payment-failed.html"
        );

    } catch (error) {

        return res.status(400).json({

            success: false,

            message: error.message,

        });

    }

};

// ===================================================
// Payment Cancelled
// ===================================================

const paymentCancelledController = async (
    req,
    res
) => {

    try {

        await paymentCancelled(
            req.body
        );

        return res.redirect(
            "http://localhost:5500/payment-cancel.html"
        );

    } catch (error) {

        return res.status(400).json({

            success: false,

            message: error.message,

        });

    }

};
// ===================================================
// Payment IPN
// ===================================================

const paymentIPNController = async (
    req,
    res
) => {

    try {

        await paymentIPN(
            req.body
        );

        return res.status(200).send("OK");

    } catch (error) {

        return res.status(400).send(
            error.message
        );

    }

};

// ===================================================
// Refund Payment
// ===================================================

const refundPaymentController = async (
    req,
    res
) => {

    try {

        const result =
            await refundPayment(

                req.params.id,

                req.body.refundAmount,

                req.body.reason

            );

        return res.status(200).json({

            success: true,

            message:
                "Refund completed successfully.",

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
// Export Controllers
// ===================================================

module.exports = {

    createPayment:
        createPaymentController,

    getMyPayments:
        getMyPaymentsController,

    getSinglePayment:
        getSinglePaymentController,

    paymentSuccess:
        paymentSuccessController,

    paymentFailed:
        paymentFailedController,

    paymentCancelled:
        paymentCancelledController,

    paymentIPN:
        paymentIPNController,

    refundPayment:
        refundPaymentController,

};