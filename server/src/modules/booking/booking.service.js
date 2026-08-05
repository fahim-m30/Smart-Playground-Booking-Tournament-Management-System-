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

    const bookingDay = new Date(payload.bookingDate).getDay();
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

    const totalAmount = pricePerHour * payload.duration;
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
    duration: payload.duration,

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
    cancelBooking,
};