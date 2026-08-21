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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(payload.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
        throw new Error("Past booking date is not allowed.");
    }

    // ===================================================
    // Validate Against Defined Slots
    // ===================================================

    const bookingDay = new Date(payload.bookingDate).getDay();
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

    const startHour = Number(payload.startTime.split(":")[0]);

    // Friday & Saturday
    if (bookingDay === 5 || bookingDay === 6) {
        pricePerHour = playground.pricing.weekend;
    }
    // Morning
    else if (startHour >= 6 && startHour < 12) {
        pricePerHour = playground.pricing.morning;
    }
    // Day
    else if (startHour >= 12 && startHour < 17) {
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
        .populate("playground")
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
    });

    if (!booking) {
        throw new Error("Booking not found.");
    }

    if (booking.bookingStatus === "Cancelled") {
        throw new Error("Booking is already cancelled.");
    }

    const [hour, minute] = String(booking.startTime || "00:00").split(":").map(Number);
    const startAt = new Date(booking.bookingDate);
    startAt.setHours(hour, minute, 0, 0);
    const cancellationDeadline = new Date(startAt.getTime() - 2 * 60 * 60 * 1000);
    if (new Date() > cancellationDeadline) {
        throw new Error("Bookings can only be cancelled at least 2 hours before the slot starts.");
    }

    booking.bookingStatus = "Cancelled";
    booking.cancelledAt = new Date();

    await booking.save();

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
};
