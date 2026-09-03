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
    verifyQR,
    refundPayment,
    startDemoCheckout,
    getDemoCheckout,
    completeDemoCheckout,
    cancelDemoCheckout,
    getPlaygroundAdminIncome,
} = require("./payment.service");

// ===================================================
// Create Payment
// ===================================================

const createPaymentController = async (req, res) => {
    try {
        const result = await createPayment(req.body, req.user.userId);

        return res.status(201).json({
            success: true,
            message: "Payment completed successfully. Ticket generated.",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const createDemoPaymentController = (paymentMethod) => async (req, res) => {
    try {
        const result = await startDemoCheckout({ ...req.body, paymentMethod }, req.user.userId);
        return res.status(201).json({ success: true, message: `${paymentMethod} demo checkout created.`, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const startDemoCheckoutController = async (req, res) => {
    try {
        const result = await startDemoCheckout(req.body, req.user.userId);
        return res.status(201).json({ success: true, message: "Demo checkout created.", data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const getDemoCheckoutController = async (req, res) => {
    try {
        const result = await getDemoCheckout(req.params.id, req.user.userId);
        return res.status(200).json({ success: true, message: "Demo checkout fetched.", data: result });
    } catch (error) {
        return res.status(404).json({ success: false, message: error.message });
    }
};

const completeDemoCheckoutController = async (req, res) => {
    try {
        const payment = await completeDemoCheckout(req.params.id, req.user.userId, req.body);
        return res.status(200).json({ success: true, message: "Demo payment completed. Ticket generated.", data: { payment } });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const cancelDemoCheckoutController = async (req, res) => {
    try {
        const payment = await cancelDemoCheckout(req.params.id, req.user.userId);
        return res.status(200).json({ success: true, message: "Demo payment cancelled.", data: payment });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ===================================================
// Get My Payments
// ===================================================

const getMyPaymentsController = async (req, res) => {
    try {
        const result = await getMyPayments(req.user.userId, {
            includeTickets: req.query.includeTickets !== "false",
        });

        return res.status(200).json({
            success: true,
            message: "Payments fetched successfully.",
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

const getSinglePaymentController = async (req, res) => {
    try {
        const result = await getSinglePayment(req.params.id, req.user.userId);

        return res.status(200).json({
            success: true,
            message: "Payment fetched successfully.",
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
// Verify QR Code
// ===================================================

const verifyQRController = async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({
                success: false,
                message: "qrData is required.",
            });
        }

        const result = await verifyQR(qrData, req.user.userId);

        return res.status(200).json({
            success: result.valid,
            message: result.message,
            data: result.data || null,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===================================================
// Refund Payment
// ===================================================

const refundPaymentController = async (req, res) => {
    try {
        const result = await refundPayment(
            req.params.id,
            req.body.refundAmount,
            req.body.reason
        );

        return res.status(200).json({
            success: true,
            message: "Refund completed successfully.",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getPlaygroundAdminIncomeController = async (req, res) => {
    try {
        const result = await getPlaygroundAdminIncome(req.user.userId);
        return res.status(200).json({ success: true, message: "Income summary fetched successfully.", data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ===================================================
// Export Controllers
// ===================================================

module.exports = {
    createPayment: createPaymentController,
    createBkashPayment: createDemoPaymentController("bKash"),
    createNagadPayment: createDemoPaymentController("Nagad"),
    createRocketPayment: createDemoPaymentController("Rocket"),
    createCardPayment: createDemoPaymentController("Card"),
    startDemoCheckout: startDemoCheckoutController,
    getDemoCheckout: getDemoCheckoutController,
    completeDemoCheckout: completeDemoCheckoutController,
    cancelDemoCheckout: cancelDemoCheckoutController,
    getMyPayments: getMyPaymentsController,
    getSinglePayment: getSinglePaymentController,
    verifyQR: verifyQRController,
    refundPayment: refundPaymentController,
    getPlaygroundAdminIncome: getPlaygroundAdminIncomeController,
};
