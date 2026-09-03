/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : booking.service.js
 * Purpose : Booking Service
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Booking = require("./booking.model");
const Playground = require("../playground/playground.model");
const Slot = require("../slot/slot.model");
const { createNotification } = require("../notification/notification.service");
const Payment = require("../payment/payment.model");
const { emitDashboardUpdate } = require("../../config/socket");
const { bookingStartsAt, calendarDate, dayRange } = require("../../utils/scheduleTime");

const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
};

// ===================================================
// Create Booking
// ===================================================

const createBooking = async (payload, customerId) => {

    // ===================================================
    // Find Playground
    // ===================================================

    const playground = await Playground.findOne({
        _id: payload.playground,
        isDeleted: false,
        isApproved: true,
        status: "Active",
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    // ===================================================
    // Booking Date Validation
    // ===================================================

    const bookingDate = new Date(payload.bookingDate);
    const todayRange = dayRange(calendarDate());

    if (bookingDate < todayRange.start) {
        throw new Error("Past booking date is not allowed.");
    }

    // ===================================================
    // Validate Against Defined Slots
    // ===================================================

    const bookingDay = new Date(payload.bookingDate).getUTCDay();
    const requestStartMinutes = timeToMinutes(payload.startTime);
    const requestEndMinutes = timeToMinutes(payload.endTime);
    if (!Number.isFinite(requestStartMinutes) || !Number.isFinite(requestEndMinutes) || requestEndMinutes <= requestStartMinutes) {
        throw new Error("Booking end time must be after the start time.");
    }
    const duration = (requestEndMinutes - requestStartMinutes) / 60;

    const activeSlots = await Slot.find({
        playground: playground._id,
        dayOfWeek: bookingDay,
        isActive: true,
        isDeleted: false,
    });

    if (activeSlots.length === 0) {
        throw new Error("This playground has not published any bookable slots for the selected day.");
    }

    const selectedSlot = activeSlots.find((slot) => slot.startTime === payload.startTime && slot.endTime === payload.endTime);
    if (!selectedSlot) {
        throw new Error("Select one of the published slots shown for this date.");
    }

    // A same-day slot is no longer bookable as soon as its start time passes.
    const slotStartAt = bookingStartsAt(bookingDate, payload.startTime);
    if (slotStartAt <= new Date()) {
        throw new Error("This slot has already started and can no longer be booked.");
    }

    // ===================================================
    // Check Time Slot Overlap
    // ===================================================

    const existingBooking = await Booking.findOne({
        playground: playground._id,
        bookingDate: payload.bookingDate,
        bookingStatus: {
            $in: ["Pending", "Confirmed"],
        },
        isDeleted: false,
        $or: [
            {
                startTime: {
                    $lt: payload.endTime,
                },
                endTime: {
                    $gt: payload.startTime,
                },
            },
        ],
    });

    if (existingBooking) {
        throw new Error("Selected time slot is already booked.");
    }

    // ===================================================
    // Dynamic Pricing
    // ===================================================

    let pricePerHour = playground.pricing.morning;

    const pricingStartHour = Number(payload.startTime.split(":")[0]);

    // Friday & Saturday
    if (bookingDay === 5 || bookingDay === 6) {
        pricePerHour = playground.pricing.weekend;
    }
    // Morning
    else if (pricingStartHour >= 6 && pricingStartHour < 12) {
        pricePerHour = playground.pricing.morning;
    }
    // Day
    else if (pricingStartHour >= 12 && pricingStartHour < 17) {
        pricePerHour = playground.pricing.day;
    }
    // Evening
    else {
        pricePerHour = playground.pricing.evening;
    }

    // A per-slot rate is authoritative when the playground admin configured
    // one. Otherwise preserve the venue's existing time-of-day pricing.
    const totalAmount = selectedSlot.price ?? (pricePerHour * duration);
    if (selectedSlot.price !== null && selectedSlot.price !== undefined) {
        pricePerHour = selectedSlot.price / duration;
    }
// ===================================================
// Generate OTP
// ===================================================

const otp = Math.floor(
    100000 + Math.random() * 900000
).toString();

const otpExpiresAt = new Date(
    Date.now() + 5 * 60 * 1000
);

    // ===================================================
    // Create Booking
    // ===================================================

   const booking = await Booking.create({
    customer: customerId,
    playground: playground._id,

    bookingDate: payload.bookingDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    duration,

    pricePerHour: pricePerHour,
    totalAmount: totalAmount,

    otp: otp,
    otpExpiresAt: otpExpiresAt,
});

    return booking;
};

// ===================================================
// Get My Bookings
// ===================================================

const getMyBookings = async (customerId) => {
    const bookings = await Booking.find({
        customer: customerId,
        isDeleted: false,
    })
        .populate("playground", "name address playgroundAdmin")
        .sort({
            createdAt: -1,
        });

    return bookings;
};

// ===================================================
// Get Single Booking
// ===================================================

const getSingleBooking = async (id, customerId) => {
    const booking = await Booking.findOne({
        _id: id,
        customer: customerId,
        isDeleted: false,
    })
        .populate("customer", "name email phone")
        .populate("playground");

    if (!booking) {
        throw new Error("Booking not found.");
    }

    return booking;
};

// ===================================================
// Get Playground Bookings
// ===================================================

const getPlaygroundBookings = async (playgroundId, adminId) => {
    const playground = await Playground.findOne({
        _id: playgroundId,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    if (playground.playgroundAdmin.toString() !== adminId) {
        throw new Error("You are not authorized to view bookings for this playground.");
    }

    const bookings = await Booking.find({
        playground: playgroundId,
        isDeleted: false,
    })
        .populate("customer", "name email phone")
        .sort({ createdAt: -1 });

    return bookings;
};

// ===================================================
// Cancel Booking
// ===================================================

const cancelBooking = async (id, customerId) => {
    const booking = await Booking.findOne({
        _id: id,
        customer: customerId,
        isDeleted: false,
    }).populate("playground", "name");

    if (!booking) {
        throw new Error("Booking not found.");
    }

    if (["Cancelled", "Completed"].includes(booking.bookingStatus)) {
        throw new Error(`A ${booking.bookingStatus.toLowerCase()} booking cannot be cancelled.`);
    }

    const startAt = bookingStartsAt(booking.bookingDate, booking.startTime);
    const cancellationDeadline = new Date(startAt.getTime() - 2 * 60 * 60 * 1000);
    if (new Date() > cancellationDeadline) {
        throw new Error("Bookings can only be cancelled at least 2 hours before the slot starts.");
    }

    booking.bookingStatus = "Cancelled";
    booking.cancelledAt = new Date();
    const paidPayment = await Payment.findOne({ booking: booking._id, customer: customerId, paymentStatus: "Paid", isDeleted: false });
    const refundAmount = paidPayment?.amount || 0;
    if (paidPayment) {
        paidPayment.paymentStatus = "Refunded";
        paidPayment.refundAmount = refundAmount;
        paidPayment.refundStatus = "Completed";
        paidPayment.refundReason = "Customer cancelled an eligible slot booking.";
        booking.paymentStatus = "Refunded";
        booking.refundAmount = refundAmount;
    } else {
        await Payment.updateMany(
            { booking: booking._id, customer: customerId, paymentStatus: "Pending", isDeleted: false },
            { $set: { paymentStatus: "Cancelled" } }
        );
    }

    await Promise.all([booking.save(), paidPayment?.save()]);
    const refundMessage = refundAmount ? ` A full refund of BDT ${refundAmount} has been completed to your original payment method.` : " No payment was captured, so no refund was needed.";
    await createNotification({
        recipient: customerId,
        type: "BookingCancelled",
        title: "Slot booking cancelled",
        message: `Your ${booking.playground?.name || "playground"} slot on ${new Date(booking.bookingDate).toLocaleDateString("en-GB")} (${booking.startTime}-${booking.endTime}) has been cancelled.${refundMessage}`,
        link: "my-bookings.html",
    });
    emitDashboardUpdate({ type: "customer-booking-cancelled", bookingId: booking._id, refundAmount });

    return booking;
};

const cancelBookingByAdmin = async (id, adminId, reason) => {
    const booking = await Booking.findOne({ _id: id, isDeleted: false }).populate("playground", "name playgroundAdmin");
    if (!booking) throw new Error("Booking not found.");
    if (String(booking.playground?.playgroundAdmin) !== String(adminId)) throw new Error("You are not authorized to cancel this booking.");
    if (["Cancelled", "Completed"].includes(booking.bookingStatus)) throw new Error(`A ${booking.bookingStatus.toLowerCase()} booking cannot be cancelled.`);
    const cancellationReason = String(reason || "").trim();
    if (cancellationReason.length < 8) throw new Error("Please provide a clear cancellation reason of at least 8 characters.");
    if (cancellationReason.length > 500) throw new Error("The cancellation reason cannot be longer than 500 characters.");
    booking.bookingStatus = "Cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = cancellationReason;
    const paidPayment = await Payment.findOne({ booking: booking._id, paymentStatus: "Paid", isDeleted: false });
    const refundAmount = paidPayment?.amount || 0;
    if (paidPayment) {
        paidPayment.paymentStatus = "Refunded";
        paidPayment.refundAmount = refundAmount;
        paidPayment.refundStatus = "Completed";
        paidPayment.refundReason = `Playground admin cancelled the slot: ${cancellationReason}`;
        booking.paymentStatus = "Refunded";
        booking.refundAmount = refundAmount;
    } else {
        await Payment.updateMany(
            { booking: booking._id, paymentStatus: "Pending", isDeleted: false },
            { $set: { paymentStatus: "Cancelled" } }
        );
    }
    await Promise.all([booking.save(), paidPayment?.save()]);
    const refundMessage = refundAmount ? ` A full demo refund of BDT ${refundAmount} has been completed to your original payment method.` : " No payment was captured, so no refund was needed.";
    await createNotification({ recipient: booking.customer, type: "BookingCancelled", title: "Your booking was cancelled by the playground", message: `${booking.playground?.name || "The playground"} cancelled your ${new Date(booking.bookingDate).toLocaleDateString("en-GB")} slot (${booking.startTime}-${booking.endTime}). Reason: ${cancellationReason}.${refundMessage}`, link: "my-bookings.html" });
    emitDashboardUpdate({ type: "playground-admin-booking-cancelled", bookingId: booking._id, refundAmount });
    return booking;
};

// ===================================================
// Export Services
// ===================================================

module.exports = {
    createBooking,
    getMyBookings,
    getSingleBooking,
    getPlaygroundBookings,
    cancelBooking,
    cancelBookingByAdmin,
};
