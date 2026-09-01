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
const { bookingEndsAt, calendarDate, dateOnlyParts, tournamentRegistrationClosesAt, zonedDateTime } = require("../../utils/scheduleTime");

const { generateQR, verifyQR: baseVerifyQR } = require("../../utils/generateQR");
const { sendBookingConfirmation, sendTournamentNotification, sendSMS } = require("../../utils/notificationService");
const { createNotification } = require("../notification/notification.service");
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

        const qrExpiresAt = bookingEndsAt(updatedBooking.bookingDate, updatedBooking.endTime);

        // Keep the signed QR payload deliberately small. Ticket details are
        // loaded from the database during validation, so duplicating venue
        // and schedule details here only makes the QR too dense for phones.
        const qrData = {
            type: "SlotBooking",
            id: updatedBooking._id.toString(),
            expiresAt: qrExpiresAt.toISOString(),
        };

        const qrCodePath = await generateQR(qrData);

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
        // A team's tournament path can extend when it advances to knockout
        // rounds, so the signed QR remains technically usable through the
        // event end. The scanner below is the authority: it accepts the QR
        // only while the team remains in the tournament.
        const qrExpiresAt = zonedDateTime(dateOnlyParts(tournament.endDate), "23:59");

        const qrData = {
            type: "TournamentTicket",
            id: updatedTeam._id.toString(),
            expiresAt: qrExpiresAt.toISOString(),
        };

        const qrCodePath = await generateQR(qrData);

        await TournamentTeam.findByIdAndUpdate(updatedTeam._id, {
            qrCode: qrCodePath,
            qrExpiresAt: qrExpiresAt,
        });
        const registrationMessage = `${updatedTeam.teamName} is registered for ${tournament.name}. Payment is complete. Your group is not assigned yet: the playground admin will run the official shuffle on the day before the tournament. Your group and final fixture will be published immediately after the draw.`;
        await Promise.all([
            updatedTeam.contactNumber ? sendSMS(updatedTeam.contactNumber, registrationMessage) : Promise.resolve(),
            createNotification({
                recipient: updatedTeam.registeredBy,
                type: "TournamentRegistrationConfirmed",
                title: "Tournament registration confirmed",
                message: registrationMessage,
                link: `tournament.html?fixture=${updatedTeam.tournament}`,
            }),
        ]);
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
            paymentStatus: "Pending",
            isDeleted: false,
        });

        if (existingPayment) {
            throw new Error("A pending payment already exists for this tournament team. Resume that checkout to complete registration.");
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

// Render a compact QR while returning every paid ticket. Earlier QR payloads
// included display-only fields, which made the code too dense at receipt size
// for some phone cameras. Validation still uses the signed ID and live data.
const ensurePaymentTicketQR = async (payment) => {
    if (payment.paymentStatus !== "Paid") return payment;

    if (payment.booking) {
        const booking = payment.booking;
        const expiresAt = booking.qrExpiresAt || bookingEndsAt(booking.bookingDate, booking.endTime);
        booking.qrCode = await generateQR({ type: "SlotBooking", id: booking._id.toString(), expiresAt: new Date(expiresAt).toISOString() });
    } else if (payment.tournamentTeam) {
        const team = payment.tournamentTeam;
        if (team.qrExpiresAt) {
            team.qrCode = await generateQR({ type: "TournamentTicket", id: team._id.toString(), expiresAt: new Date(team.qrExpiresAt).toISOString() });
        }
    }

    return payment;
};

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

    return Promise.all(payments.map(ensurePaymentTicketQR));
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

    return ensurePaymentTicketQR(payment);
};

// ===================================================
// Verify QR Code
// ===================================================

const verifyQR = async (qrDataString, adminId) => {
    const parsed = baseVerifyQR(qrDataString);

    if (!parsed.valid) {
        return parsed;
    }

    const { type, id } = parsed.data;
    const now = new Date();

    if (type === "SlotBooking") {
        const booking = await Booking.findById(id)
            .populate("customer", "name phone")
            .populate("playground", "name address playgroundAdmin");

        if (!booking || booking.isDeleted) {
            return { valid: false, message: "Slot ticket not found.", data: { type: "SlotBooking", ticketType: "Slot booking" } };
        }

        if (String(booking.playground?.playgroundAdmin) !== String(adminId)) {
            return { valid: false, message: "Ticket not found at this playground.", data: { type: "SlotBooking", ticketType: "Slot booking" } };
        }

        const ticket = {
            type: "SlotBooking",
            ticketType: "Slot booking",
            bookingId: booking._id.toString(),
            customerName: booking.customer?.name || "Customer",
            customerPhone: booking.customer?.phone || null,
            playground: { id: booking.playground._id.toString(), name: booking.playground.name, address: booking.playground.address },
            date: booking.bookingDate.toISOString().split("T")[0],
            startTime: booking.startTime,
            endTime: booking.endTime,
        };

        if (booking.bookingStatus !== "Confirmed" || booking.paymentStatus !== "Paid") {
            return { valid: false, message: "Slot booking is not confirmed and paid.", data: ticket };
        }

        const slotEnd = bookingEndsAt(booking.bookingDate, booking.endTime);
        if (now > slotEnd) {
            return { valid: false, message: `Slot time ended at ${booking.endTime} on ${ticket.date}. This QR ticket is invalid.`, expired: true, data: ticket };
        }

        const checkedIn = await Booking.findByIdAndUpdate(
            booking._id,
            { $set: { isScanned: true, checkedInAt: booking.checkedInAt || now, checkedInBy: booking.checkedInBy || adminId } },
            { new: true }
        );

        return {
            valid: true,
            message: "Authenticated slot booking. Valid until the slot ends.",
            data: {
                ...ticket,
                checkedInAt: checkedIn.checkedInAt,
            },
        };

    } else if (type === "TournamentTicket") {
        const team = await TournamentTeam.findById(id).populate({ path: "tournament", populate: { path: "playground", select: "name address playgroundAdmin" } });

        if (!team || team.isDeleted) {
            return { valid: false, message: "Tournament ticket not found.", data: { type: "TournamentTicket", ticketType: "Tournament" } };
        }

        const tournament = team.tournament;
        if (!tournament || tournament.isDeleted) return { valid: false, message: "Tournament ticket not found.", data: { type: "TournamentTicket", ticketType: "Tournament" } };
        if (String(tournament.playground?.playgroundAdmin) !== String(adminId)) {
            return { valid: false, message: "Ticket not found at this playground.", data: { type: "TournamentTicket", ticketType: "Tournament" } };
        }
        const teamMatches = await TournamentMatch.find({
            tournament: tournament._id,
            $or: [{ teamA: team._id }, { teamB: team._id }],
        })
            .populate("teamA", "teamName")
            .populate("teamB", "teamName")
            .sort({ matchDate: 1, startTime: 1 });
        const matchSummary = (match) => {
            if (!match) return null;
            const isTeamA = String(match.teamA?._id || match.teamA) === String(team._id);
            const opponent = isTeamA ? match.teamB : match.teamA;
            return {
                stage: match.stage,
                matchday: match.matchday || null,
                status: match.matchStatus,
                date: match.matchDate?.toISOString().split("T")[0] || null,
                startTime: match.startTime,
                endTime: match.endTime,
                opponent: opponent?.teamName || "Opponent to be confirmed",
            };
        };
        const liveMatch = teamMatches.find((match) => match.matchStatus === "Live");
        const scheduledMatch = teamMatches.find((match) => match.matchStatus === "Scheduled");
        const latestPlayedMatch = [...teamMatches].reverse().find((match) => match.matchStatus === "Completed");
        const activeRoundMatch = liveMatch || scheduledMatch;
        const currentMatch = liveMatch || scheduledMatch || latestPlayedMatch;
        const ticket = {
            type: "TournamentTicket",
            ticketType: "Tournament",
            teamId: team._id.toString(),
            teamName: team.teamName,
            captainName: team.captain?.name || null,
            contactNumber: team.contactNumber || null,
            tournament: {
                id: tournament._id.toString(),
                name: tournament.name,
                status: tournament.status,
                currentRound: team.isKnockedOut ? "Eliminated" : (activeRoundMatch?.stage || "No active match day"),
                currentMatch: matchSummary(activeRoundMatch || currentMatch),
            },
            playground: { id: tournament.playground._id.toString(), name: tournament.playground.name, address: tournament.playground.address },
        };
        if (team.paymentStatus !== "Paid" || ["Cancelled", "Completed"].includes(tournament.status)) {
            return { valid: false, message: "Tournament is no longer active.", data: ticket };
        }
        const eventDate = calendarDate();
        const startsTodayOrEarlier = new Date(tournament.startDate) <= new Date(Date.UTC(eventDate.year, eventDate.month - 1, eventDate.day));
        if (!startsTodayOrEarlier) {
            return { valid: false, message: "Tournament has not started yet.", data: ticket };
        }
        if (team.isKnockedOut) {
            return { valid: false, message: "This team has been eliminated from the tournament. QR ticket is invalid.", expired: true, data: ticket };
        }
        if (!activeRoundMatch) {
            return { valid: false, message: "This team has no active match day or scheduled round. QR ticket is invalid.", data: ticket };
        }

        const checkedIn = await TournamentTeam.findByIdAndUpdate(
            team._id,
            { $set: { isScanned: true, checkedInAt: team.checkedInAt || now, checkedInBy: team.checkedInBy || adminId } },
            { new: true }
        );

        return {
            valid: true,
            message: "Authenticated tournament ticket. This team remains eligible in the tournament.",
            data: {
                ...ticket,
                checkedInAt: checkedIn.checkedInAt,
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
