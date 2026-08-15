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
const TournamentTeam = require("../tournament/tournamentTeam.model");
const Tournament = require("../tournament/tournament.model");
const User = require("../user/user.model");

const sslcommerz = require("../../config/sslcommerz");
const validateSSLPayment = require("../../utils/sslValidation");
const { generateQR } = require("../../utils/generateQR");

// ===================================================
// Create Payment
// ===================================================

const createPayment = async (payload, customerId) => {
    let amount = 0;
    let booking = null;
    let tournamentTeam = null;
    let tournament = null;
    let productName = "";
    let referenceId = null;

    // Slot Booking Payment
    if (payload.booking) {
        booking = await Booking.findOne({
            _id: payload.booking,
            customer: customerId,
            isDeleted: false,
        });

        if (!booking) {
            throw new Error("Booking not found.");
        }

        if (booking.bookingStatus === "Cancelled") {
            throw new Error("Cancelled booking cannot be paid.");
        }

        if (booking.paymentStatus === "Paid") {
            throw new Error("Booking already paid.");
        }

        const existingPayment = await Payment.findOne({
            booking: booking._id,
            isDeleted: false,
        });

        if (existingPayment) {
            throw new Error("Payment already exists for this booking.");
        }

        amount = booking.totalAmount;
        productName = "Playground Slot Booking";
        referenceId = booking._id;
    }
    // Tournament Registration Payment
    else if (payload.tournamentTeam) {
        tournamentTeam = await TournamentTeam.findOne({
            _id: payload.tournamentTeam,
            isDeleted: false,
        });

        if (!tournamentTeam) {
            throw new Error("Tournament team not found.");
        }

        if (tournamentTeam.paymentStatus === "Paid") {
            throw new Error("Tournament team already paid.");
        }

        const existingPayment = await Payment.findOne({
            tournamentTeam: tournamentTeam._id,
            isDeleted: false,
        });

        if (existingPayment) {
            throw new Error("Payment already exists for this tournament team.");
        }

        tournament = await Tournament.findById(tournamentTeam.tournament);

        if (!tournament) {
            throw new Error("Tournament not found.");
        }

        amount = tournament.registrationFee;
        productName = `Tournament Registration - ${tournament.name}`;
        referenceId = tournamentTeam._id;
    }
    else {
        throw new Error("Either booking or tournamentTeam is required.");
    }

    // Customer
    const customer = await User.findById(customerId);

    if (!customer) {
        throw new Error("Customer not found.");
    }

    // Determine payment type
    const paymentType = payload.booking ? "SlotBooking" : "Tournament";

    // Create Payment Record
    const payment = await Payment.create({
        booking: booking ? booking._id : null,
        tournament: tournament ? tournament._id : null,
        tournamentTeam: tournamentTeam ? tournamentTeam._id : null,
        customer: customerId,
        amount: amount,
        paymentType: paymentType,
        paymentMethod: payload.paymentMethod,
        paymentStatus: "Pending",
    });

    // ==========================================
    // Payment Session Data
    // ==========================================

    const data = {
        total_amount: amount,
        currency: "BDT",
        tran_id: payment._id.toString(),
        success_url:
            "http://localhost:5000/api/v1/payments/success",
        fail_url:
            "http://localhost:5000/api/v1/payments/fail",
        cancel_url:
            "http://localhost:5000/api/v1/payments/cancel",
        ipn_url:
            "http://localhost:5000/api/v1/payments/ipn",
        shipping_method: "Courier",
        product_name: productName,
        product_category: "Sports",
        product_profile: "general",
        cus_name: customer.name,
        cus_email: customer.email,
        cus_add1: customer.address || "Dhaka",
        cus_city: customer.city || "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1200",
        cus_country: "Bangladesh",
        cus_phone: customer.phone || "01700000000",
        ship_name: customer.name,
        ship_add1: customer.address || "Dhaka",
        ship_city: customer.city || "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: "1200",
        ship_country: "Bangladesh",
    };

    // Create SSL Session
    const sslResponse =
        await sslcommerz.init(data);

    console.log("==============================");
    console.log("SSL RESPONSE");
    console.log(sslResponse);
    console.log("==============================");

    if (!sslResponse.GatewayPageURL) {

        await Payment.findByIdAndDelete(
            payment._id
        );

        throw new Error(
            sslResponse.failedreason ||
            "Failed to create payment session."
        );
    }

    return {

        payment,

        gatewayUrl:
            sslResponse.GatewayPageURL,

    };

};
// ===================================================
// Get My Payments
// ===================================================

const getMyPayments = async (customerId) => {

    const payments = await Payment.find({

        customer: customerId,

        isDeleted: false,

    })
        .populate({
            path: "booking",
            populate: {
                path: "playground",
                select: "name address coverImage",
            },
        })
        .populate({
            path: "tournamentTeam",
            populate: {
                path: "tournament",
                select: "name sportType",
            },
        })
        .populate(
            "customer",
            "name email phone"
        )
        .sort({
            createdAt: -1,
        });

    return payments;

};

// ===================================================
// Get Single Payment
// ===================================================

const getSinglePayment = async (
    paymentId,
    customerId
) => {

    const payment = await Payment.findOne({

        _id: paymentId,

        customer: customerId,

        isDeleted: false,

    })
        .populate({
            path: "booking",
            populate: {
                path: "playground",
                select:
                    "name address coverImage",
            },
        })
        .populate({
            path: "tournamentTeam",
            populate: {
                path: "tournament",
                select: "name sportType",
            },
        })
        .populate(
            "customer",
            "name email phone"
        );

    if (!payment) {

        throw new Error(
            "Payment not found."
        );

    }

    return payment;

};
// ===================================================
// Payment Success
// ===================================================

const paymentSuccess = async (payload) => {

    // Validate Payment

    const validation =
        await validateSSLPayment(
            payload.val_id
        );

    if (
        validation.status !== "VALID" &&
        validation.status !== "VALIDATED"
    ) {
        throw new Error(
            "Payment validation failed."
        );
    }

    // Find Payment

    const payment =
        await Payment.findById(
            payload.tran_id
        );

    if (!payment) {
        throw new Error(
            "Payment not found."
        );
    }

    // Prevent Duplicate

    if (
        payment.paymentStatus === "Paid"
    ) {
        return payment;
    }

    // Update Payment

    payment.paymentStatus = "Paid";

    payment.transactionId =
        payload.tran_id;

    payment.validationId =
        payload.val_id || null;

    payment.bankTransactionId =
        payload.bank_tran_id || null;

    payment.cardType =
        payload.card_type || null;

    payment.cardIssuer =
        payload.card_issuer || null;

    payment.paymentMethod =
        payload.card_type || payment.paymentMethod;

    payment.paidAt =
        new Date();

    await payment.save();

    // Update Booking or TournamentTeam and Generate QR

    if (payment.booking) {

        const updatedBooking = await Booking.findByIdAndUpdate(

            payment.booking,

            {

                paymentStatus:
                    "Paid",

                bookingStatus:
                    "Confirmed",

                transactionId:
                    payload.tran_id,

                paymentMethod:
                    payload.card_type || payment.paymentMethod,

            },

            { new: true }

        );

        const qrExpiresAt = new Date(updatedBooking.bookingDate);
        const [endHour] = updatedBooking.endTime.split(":").map(Number);
        qrExpiresAt.setHours(endHour, 0, 0, 0);

        const qrData = {
            type: "SlotBooking",
            id: updatedBooking._id.toString(),
            playground: updatedBooking.playground.toString(),
            date: updatedBooking.bookingDate.toISOString().split("T")[0],
            startTime: updatedBooking.startTime,
            endTime: updatedBooking.endTime,
            expiresAt: qrExpiresAt.toISOString(),
        };

        const qrFileName = `booking-${updatedBooking._id}-${Date.now()}.png`;
        const qrCodePath = await generateQR(qrData, qrFileName);

        await Booking.findByIdAndUpdate(updatedBooking._id, {
            qrCode: qrCodePath,
            qrExpiresAt: qrExpiresAt,
        });

    } else if (payment.tournamentTeam) {

        const updatedTeam = await TournamentTeam.findByIdAndUpdate(

            payment.tournamentTeam,

            {

                paymentStatus: "Paid",

                transactionId: payload.tran_id,

                paymentMethod: payload.card_type || payment.paymentMethod,

            },

            { new: true }

        );

        const tournament = await Tournament.findById(updatedTeam.tournament);
        const TournamentMatch = require("../tournament/tournamentMatch.model");
        const latestMatch = await TournamentMatch.find({
            tournament: updatedTeam.tournament,
            $or: [{ teamA: updatedTeam._id }, { teamB: updatedTeam._id }],
        }).sort({ matchDate: -1, startTime: -1 }).limit(1);

        const qrExpiresAt = latestMatch.length > 0
            ? new Date(latestMatch[0].matchDate)
            : new Date(tournament.endDate);

        if (latestMatch.length > 0) {
            const [endHour] = latestMatch[0].endTime.split(":").map(Number);
            qrExpiresAt.setHours(endHour, 0, 0, 0);
        } else {
            qrExpiresAt.setHours(23, 59, 59, 999);
        }

        const qrData = {
            type: "TournamentTicket",
            id: updatedTeam._id.toString(),
            tournament: updatedTeam.tournament.toString(),
            teamName: updatedTeam.teamName,
            tournamentName: tournament.name,
            expiresAt: qrExpiresAt.toISOString(),
        };

        const qrFileName = `tournament-${updatedTeam._id}-${Date.now()}.png`;
        const qrCodePath = await generateQR(qrData, qrFileName);

        await TournamentTeam.findByIdAndUpdate(updatedTeam._id, {
            qrCode: qrCodePath,
            qrExpiresAt: qrExpiresAt,
        });

    }

    return payment;

};
// ===================================================
// Payment Failed
// ===================================================

const paymentFailed = async (payload) => {

    const payment = await Payment.findById(
        payload.tran_id
    );

    if (!payment) {
        throw new Error(
            "Payment not found."
        );
    }

    payment.paymentStatus = "Failed";

    payment.transactionId =
        payload.tran_id || null;

    await payment.save();

    if (payment.booking) {
        await Booking.findByIdAndUpdate(
            payment.booking,
            {
                paymentStatus: "Pending",
                bookingStatus: "Pending",
            }
        );
    } else if (payment.tournamentTeam) {
        await TournamentTeam.findByIdAndUpdate(
            payment.tournamentTeam,
            {
                paymentStatus: "Pending",
            }
        );
    }

    return payment;

};

// ===================================================
// Payment Cancelled
// ===================================================

const paymentCancelled = async (payload) => {

    const payment = await Payment.findById(
        payload.tran_id
    );

    if (!payment) {
        throw new Error(
            "Payment not found."
        );
    }

    payment.paymentStatus = "Cancelled";

    payment.transactionId =
        payload.tran_id || null;

    await payment.save();

    if (payment.booking) {
        await Booking.findByIdAndUpdate(
            payment.booking,
            {
                paymentStatus: "Pending",
                bookingStatus: "Pending",
            }
        );
    } else if (payment.tournamentTeam) {
        await TournamentTeam.findByIdAndUpdate(
            payment.tournamentTeam,
            {
                paymentStatus: "Pending",
            }
        );
    }

    return payment;

};
// ===================================================
// Payment IPN
// ===================================================

const paymentIPN = async (payload) => {

    if (
        !payload ||
        !payload.val_id ||
        !payload.tran_id
    ) {
        return null;
    }

    // Validate Transaction

    const validation =
        await validateSSLPayment(
            payload.val_id
        );

    if (
        validation.status !== "VALID" &&
        validation.status !== "VALIDATED"
    ) {
        return null;
    }

    // Find Payment

    const payment =
        await Payment.findById(
            payload.tran_id
        );

    if (!payment) {
        return null;
    }

    // Already Paid

    if (
        payment.paymentStatus === "Paid"
    ) {
        return payment;
    }

    // Update Payment

    payment.paymentStatus = "Paid";

    payment.transactionId =
        payload.tran_id;

    payment.validationId =
        payload.val_id;

    payment.bankTransactionId =
        payload.bank_tran_id || null;

    payment.cardType =
        payload.card_type || null;

    payment.cardIssuer =
        payload.card_issuer || null;

    payment.paymentMethod =
        payload.card_type || payment.paymentMethod;

    payment.paidAt =
        new Date();

    await payment.save();

    // Update Booking or TournamentTeam

    if (payment.booking) {

        await Booking.findByIdAndUpdate(

            payment.booking,

            {

                paymentStatus:
                    "Paid",

                bookingStatus:
                    "Confirmed",

                transactionId:
                    payload.tran_id,

                paymentMethod:
                    payload.card_type || payment.paymentMethod,

            }

        );

    } else if (payment.tournamentTeam) {

        await TournamentTeam.findByIdAndUpdate(

            payment.tournamentTeam,

            {

                paymentStatus: "Paid",

                transactionId: payload.tran_id,

                paymentMethod: payload.card_type || payment.paymentMethod,

            }

        );

    }

    return payment;

};

// ===================================================
// Refund Payment
// ===================================================

const refundPayment = async (

    paymentId,

    refundAmount,

    reason

) => {

    const payment =
        await Payment.findById(
            paymentId
        );

    if (!payment) {
        throw new Error(
            "Payment not found."
        );
    }

    if (
        payment.paymentStatus !== "Paid"
    ) {
        throw new Error(
            "Only paid payments can be refunded."
        );
    }

    payment.paymentStatus =
        "Refunded";

    payment.refundAmount =
        refundAmount;

    payment.refundStatus =
        "Completed";

    payment.refundReason =
        reason;

    await payment.save();

    if (payment.booking) {
        await Booking.findByIdAndUpdate(

            payment.booking,

            {

                paymentStatus:
                    "Refunded",

                bookingStatus:
                    "Cancelled",

                refundAmount,

            }

        );
    } else if (payment.tournamentTeam) {
        await TournamentTeam.findByIdAndUpdate(
            payment.tournamentTeam,
            {
                paymentStatus: "Refunded",
            }
        );
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

    paymentSuccess,

    paymentFailed,

    paymentCancelled,

    paymentIPN,

    refundPayment,

};