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
const TournamentMatch = require("../tournament/tournamentMatch.model");
const User = require("../user/user.model");
const Playground = require("../playground/playground.model");
const { tournamentRegistrationClosesAt } = require("../../utils/scheduleTime");

const { generateQR, verifyQR: baseVerifyQR } = require("../../utils/generateQR");
const { sendBookingConfirmation, sendTournamentNotification } = require("../../utils/notificationService");
const { emitToUser, emitDashboardUpdate } = require("../../config/socket");

// ===================================================
// Confirm Payment (Dummy API - Always Success)
// ===================================================

const confirmPayment = async (paymentId, paymentMethod, transactionId = null) => {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
        throw new Error("Payment not found.");
    }

    if (payment.paymentStatus === "Paid") {
        return payment;
    }

    // A checkout can remain open after the registration deadline. Re-check
    // here so a late confirmation cannot put a paid team into a cancelled or
    // finalised tournament.
    if (payment.tournamentTeam) {
        const team = await TournamentTeam.findById(payment.tournamentTeam).select("tournament isDeleted");
        const tournament = team && !team.isDeleted ? await Tournament.findById(team.tournament).select("status startDate") : null;
        if (!tournament || tournament.status !== "Upcoming" || new Date() >= tournamentRegistrationClosesAt(tournament.startDate)) {
            throw new Error("This tournament registration can no longer be paid because registration has closed.");
        }
    }

    payment.paymentStatus = "Paid";
    payment.transactionId = transactionId || payment._id.toString();
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.paidAt = new Date();

    await payment.save();

    if (payment.booking) {
        const updatedBooking = await Booking.findByIdAndUpdate(
            payment.booking,
            {
                paymentStatus: "Paid",
                bookingStatus: "Confirmed",
                transactionId: payment._id.toString(),
                paymentMethod: paymentMethod || payment.paymentMethod,
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

        await sendBookingConfirmation(updatedBooking._id.toString());
        emitToUser(updatedBooking.customer.toString(), "booking:updated", { bookingId: updatedBooking._id, status: "Confirmed", paymentStatus: "Paid" });
        emitDashboardUpdate({ type: "booking-confirmed", bookingId: updatedBooking._id });

    } else if (payment.tournamentTeam) {
        const updatedTeam = await TournamentTeam.findByIdAndUpdate(
            payment.tournamentTeam,
            {
                paymentStatus: "Paid",
                transactionId: payment._id.toString(),
                paymentMethod: paymentMethod || payment.paymentMethod,
            },
            { new: true }
        );

        const tournament = await Tournament.findById(updatedTeam.tournament);
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
        emitToUser(updatedTeam.registeredBy.toString(), "tournament:updated", { tournamentId: updatedTeam.tournament, teamId: updatedTeam._id });
    }

    return payment;
};

// ===================================================
// Create Payment
// ===================================================

const preparePayment = async (payload, customerId) => {
    let amount = 0;
    let booking = null;
    let tournamentTeam = null;
    let tournament = null;
    let productName = "";

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

    } else if (payload.tournamentTeam) {
        tournamentTeam = await TournamentTeam.findOne({
            _id: payload.tournamentTeam,
            registeredBy: customerId,
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

        if (tournament.status !== "Upcoming" || new Date() >= tournamentRegistrationClosesAt(tournament.startDate)) {
            throw new Error("Tournament registration payment is no longer accepted because registration has closed.");
        }

        amount = tournament.registrationFee;
        productName = `Tournament Registration - ${tournament.name}`;

    } else {
        throw new Error("Either booking or tournamentTeam is required.");
    }

    const customer = await User.findById(customerId);

    if (!customer) {
        throw new Error("Customer not found.");
    }

    const paymentType = payload.booking ? "SlotBooking" : "Tournament";

    return Payment.create({
        booking: booking ? booking._id : null,
        tournament: tournament ? tournament._id : null,
        tournamentTeam: tournamentTeam ? tournamentTeam._id : null,
        customer: customerId,
        amount: amount,
        paymentType: paymentType,
        paymentMethod: payload.paymentMethod,
        paymentStatus: "Pending",
    });

};

const createPayment = async (payload, customerId) => {
    const payment = await preparePayment(payload, customerId);
    await confirmPayment(payment._id, payload.paymentMethod);
    const confirmedPayment = await Payment.findById(payment._id)
        .populate("booking")
        .populate("tournamentTeam");

    return {
        payment: confirmedPayment,
        ticket: confirmedPayment.booking
            ? { type: "SlotBooking", qrCode: confirmedPayment.booking?.qrCode }
            : { type: "Tournament", qrCode: confirmedPayment.tournamentTeam?.qrCode },
    };
};

// ===================================================
// Demo Gateway Checkout
// ===================================================

const DEMO_METHODS = ["bKash", "Nagad", "Rocket", "Card"];

const startDemoCheckout = async (payload, customerId) => {
    if (!DEMO_METHODS.includes(payload.paymentMethod)) {
        throw new Error("Choose a supported payment method.");
    }

    const payment = await preparePayment(payload, customerId);

    return {
        payment,
        checkout: {
            provider: payment.paymentMethod,
            reference: `TURF-${payment._id.toString().slice(-8).toUpperCase()}`,
            amount: payment.amount,
            currency: "BDT",
        },
    };
};

const getDemoCheckout = async (paymentId, customerId) => {
    const payment = await Payment.findOne({
        _id: paymentId,
        customer: customerId,
        isDeleted: false,
    }).populate({
        path: "booking",
        populate: { path: "playground", select: "name address area" },
    }).populate({
        path: "tournamentTeam",
        populate: { path: "tournament", select: "name" },
    });

    if (!payment) throw new Error("Payment checkout was not found.");
    if (!DEMO_METHODS.includes(payment.paymentMethod)) throw new Error("This payment does not use the demo gateway.");

    return {
        payment,
        checkout: {
            provider: payment.paymentMethod,
            reference: `TURF-${payment._id.toString().slice(-8).toUpperCase()}`,
            amount: payment.amount,
            currency: "BDT",
        },
    };
};

const validateDemoCredentials = (paymentMethod, credentials = {}) => {
    if (paymentMethod === "Card") {
        const cardNumber = String(credentials.cardNumber || "").replace(/\D/g, "");
        const expiry = String(credentials.expiry || "").trim();
        const cvv = String(credentials.cvv || "").trim();
        if (cardNumber.length < 13 || cardNumber.length > 19) throw new Error("Enter a valid demo card number.");
        if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expiry)) throw new Error("Use card expiry in MM/YY format.");
        if (!/^\d{3,4}$/.test(cvv)) throw new Error("Enter a valid CVV.");
        return;
    }

    const mobileNumber = String(credentials.mobileNumber || "").replace(/\s|-/g, "");
    if (!/^01\d{9}$/.test(mobileNumber)) throw new Error("Enter an 11-digit Bangladeshi mobile number.");
    if (!/^\d{4,6}$/.test(String(credentials.pin || ""))) throw new Error("Enter your 4 to 6 digit demo PIN.");
    if (!/^\d{6}$/.test(String(credentials.otp || ""))) throw new Error("Enter the 6-digit demo verification code.");
};

const completeDemoCheckout = async (paymentId, customerId, credentials) => {
    const payment = await Payment.findOne({
        _id: paymentId,
        customer: customerId,
        isDeleted: false,
    });

    if (!payment) throw new Error("Payment checkout was not found.");
    if (payment.paymentStatus === "Paid") return payment;
    if (payment.paymentStatus !== "Pending") throw new Error("This payment can no longer be completed.");

    validateDemoCredentials(payment.paymentMethod, credentials);
    const providerCode = payment.paymentMethod.replace(/[^A-Za-z]/g, "").toUpperCase();
    const transactionId = `DEMO-${providerCode}-${Date.now()}-${payment._id.toString().slice(-5).toUpperCase()}`;
    await confirmPayment(payment._id, payment.paymentMethod, transactionId);

    return Payment.findById(payment._id)
        .populate("booking")
        .populate("tournamentTeam");
};

const cancelDemoCheckout = async (paymentId, customerId) => {
    const payment = await Payment.findOne({ _id: paymentId, customer: customerId, isDeleted: false });
    if (!payment) throw new Error("Payment checkout was not found.");
    if (payment.paymentStatus !== "Pending") throw new Error("Only a pending payment can be cancelled.");

    payment.paymentStatus = "Cancelled";
    await payment.save();

    if (payment.booking) {
        await Booking.findByIdAndUpdate(payment.booking, { bookingStatus: "Cancelled", cancelledAt: new Date() });
    }

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
        .populate("customer", "name email phone")
        .sort({ createdAt: -1 });

    return payments;
};

// ===================================================
// Get Single Payment
// ===================================================

const getSinglePayment = async (paymentId, customerId) => {
    const payment = await Payment.findOne({
        _id: paymentId,
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
        .populate("customer", "name email phone");

    if (!payment) {
        throw new Error("Payment not found.");
    }

    return payment;
};

// ===================================================
// Verify QR Code
// ===================================================

const verifyQR = async (qrDataString) => {
    const parsed = baseVerifyQR(qrDataString);

    if (!parsed.valid) {
        return parsed;
    }

    const { type, id, expiresAt } = parsed.data;
    const now = new Date();

    if (type === "SlotBooking") {
        const booking = await Booking.findById(id).populate("playground", "name");

        if (!booking) {
            return { valid: false, message: "Booking not found." };
        }

        if (booking.bookingStatus === "Cancelled") {
            return { valid: false, message: "Booking has been cancelled." };
        }

        if (booking.paymentStatus !== "Paid") {
            return { valid: false, message: "Payment not completed for this booking." };
        }

        const slotEnd = new Date(booking.bookingDate);
        const [endHour] = booking.endTime.split(":").map(Number);
        slotEnd.setHours(endHour, 0, 0, 0);

        if (now > slotEnd) {
            return { valid: false, message: "Slot time has expired. QR code is no longer valid.", expired: true };
        }

        return {
            valid: true,
            message: "Slot booking QR is valid.",
            data: {
                type: "SlotBooking",
                bookingId: booking._id.toString(),
                playground: booking.playground,
                date: booking.bookingDate.toISOString().split("T")[0],
                startTime: booking.startTime,
                endTime: booking.endTime,
            },
        };

    } else if (type === "TournamentTicket") {
        const team = await TournamentTeam.findById(id).populate("tournament", "name status endDate");

        if (!team) {
            return { valid: false, message: "Tournament team not found." };
        }

        if (team.paymentStatus !== "Paid") {
            return { valid: false, message: "Payment not completed for this tournament registration." };
        }

        const activeMatch = await TournamentMatch.findOne({
            tournament: team.tournament,
            $or: [{ teamA: team._id }, { teamB: team._id }],
            matchStatus: { $in: ["Scheduled", "Live"] },
        });

        if (!activeMatch) {
            const latestCompleted = await TournamentMatch.findOne({
                tournament: team.tournament,
                $or: [{ teamA: team._id }, { teamB: team._id }],
            }).sort({ matchDate: -1, startTime: -1 });

            if (latestCompleted && latestCompleted.matchStatus === "Completed") {
                return { valid: false, message: "All matches for this team have been completed. QR code is no longer valid.", expired: true };
            }

            const tournament = await Tournament.findById(team.tournament);
            if (tournament && tournament.status === "Completed") {
                return { valid: false, message: "Tournament has ended. QR code is no longer valid.", expired: true };
            }
        }

        return {
            valid: true,
            message: "Tournament ticket QR is valid.",
            data: {
                type: "TournamentTicket",
                teamId: team._id.toString(),
                teamName: team.teamName,
                tournament: team.tournament,
            },
        };
    }

    return { valid: false, message: "Invalid QR code type." };
};

// ===================================================
// Refund Payment
// ===================================================

const refundPayment = async (paymentId, refundAmount, reason) => {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
        throw new Error("Payment not found.");
    }

    if (payment.paymentStatus !== "Paid") {
        throw new Error("Only paid payments can be refunded.");
    }

    payment.paymentStatus = "Refunded";
    payment.refundAmount = refundAmount;
    payment.refundStatus = "Completed";
    payment.refundReason = reason;

    await payment.save();

    if (payment.booking) {
        await Booking.findByIdAndUpdate(payment.booking, {
            paymentStatus: "Refunded",
            bookingStatus: "Cancelled",
            refundAmount,
        });
    } else if (payment.tournamentTeam) {
        await TournamentTeam.findByIdAndUpdate(payment.tournamentTeam, {
            paymentStatus: "Refunded",
        });
    }

    return payment;
};

const getPlaygroundAdminIncome = async (adminId) => {
    const grounds = await Playground.find({ playgroundAdmin: adminId, isDeleted: false }).select("_id name");
    const groundIds = grounds.map((ground) => ground._id);
    const paid = { paymentStatus: "Paid", isDeleted: false };
    const [slotPayments, tournamentPayments] = await Promise.all([
        Payment.find({ ...paid, paymentType: "SlotBooking" }).populate({ path: "booking", select: "playground bookingDate startTime endTime" }),
        Payment.find({ ...paid, paymentType: "Tournament" }).populate({ path: "tournament", select: "playground name startDate" }).populate("tournamentTeam", "teamName"),
    ]);
    const ownsGround = (id) => groundIds.some((groundId) => String(groundId) === String(id));
    const slots = slotPayments.filter((payment) => payment.booking && ownsGround(payment.booking.playground)).map((payment) => ({
        paymentId: payment._id, amount: payment.amount, paidAt: payment.paidAt, method: payment.paymentMethod,
        playground: grounds.find((ground) => String(ground._id) === String(payment.booking.playground))?.name || "Playground",
        date: payment.booking.bookingDate, startTime: payment.booking.startTime, endTime: payment.booking.endTime,
    }));
    const tournaments = tournamentPayments.filter((payment) => payment.tournament && ownsGround(payment.tournament.playground)).map((payment) => ({
        paymentId: payment._id, amount: payment.amount, paidAt: payment.paidAt, method: payment.paymentMethod,
        playground: grounds.find((ground) => String(ground._id) === String(payment.tournament.playground))?.name || "Playground",
        tournament: payment.tournament.name, team: payment.tournamentTeam?.teamName || "Team registration", date: payment.tournament.startDate,
    }));
    const slotTotal = slots.reduce((total, payment) => total + payment.amount, 0);
    const tournamentTotal = tournaments.reduce((total, payment) => total + payment.amount, 0);
    return { slotTotal, tournamentTotal, total: slotTotal + tournamentTotal, slots, tournaments };
};

// ===================================================
// Export Services
// ===================================================

module.exports = {
    createPayment,
    startDemoCheckout,
    getDemoCheckout,
    completeDemoCheckout,
    cancelDemoCheckout,
    getMyPayments,
    getSinglePayment,
    confirmPayment,
    verifyQR,
    refundPayment,
    getPlaygroundAdminIncome,
};
