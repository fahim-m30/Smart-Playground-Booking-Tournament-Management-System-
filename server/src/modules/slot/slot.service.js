/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : slot.service.js
 * Purpose : Slot Service
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Slot = require("./slot.model");
const Playground = require("../playground/playground.model");
const Booking = require("../booking/booking.model");

const timeToMinutes = (time) => {
    const [hour, minute] = String(time).split(":").map(Number);
    return hour * 60 + minute;
};

const assertValidRange = ({ startTime, endTime, durationMinutes }) => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        throw new Error("Slot end time must be after its start time.");
    }
    if (durationMinutes && end - start !== Number(durationMinutes)) {
        throw new Error("Slot duration must match the selected start and end time.");
    }
};

// ===================================================
// Create Slot
// ===================================================

const createSlot = async (payload, adminId) => {
    assertValidRange(payload);
    const playground = await Playground.findOne({
        _id: payload.playground,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    if (playground.playgroundAdmin.toString() !== adminId) {
        throw new Error("You are not authorized to manage slots for this playground.");
    }

    const existingSlot = await Slot.findOne({
        playground: payload.playground,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        isDeleted: false,
    });

    if (existingSlot) {
        throw new Error("Slot already exists for this playground on this day.");
    }

    const slot = await Slot.create({
        playground: payload.playground,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        durationMinutes: payload.durationMinutes || timeToMinutes(payload.endTime) - timeToMinutes(payload.startTime),
        price: payload.price ?? null,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
    });

    return slot;
};

const createSlots = async (payload, adminId) => {
    if (!Array.isArray(payload.slots) || payload.slots.length === 0 || payload.slots.length > 168) {
        throw new Error("Provide between 1 and 168 slots in a schedule.");
    }
    const keys = new Set();
    for (const slot of payload.slots) {
        assertValidRange(slot);
        const key = `${slot.playground}:${slot.dayOfWeek}:${slot.startTime}:${slot.endTime}`;
        if (keys.has(key)) throw new Error("Your schedule contains duplicate slots.");
        keys.add(key);
    }

    const playgroundIds = [...new Set(payload.slots.map((slot) => String(slot.playground)))];
    if (playgroundIds.length !== 1) throw new Error("Create a schedule for one playground at a time.");

    const playground = await Playground.findOne({ _id: playgroundIds[0], isDeleted: false });
    if (!playground) throw new Error("Playground not found.");
    if (playground.playgroundAdmin.toString() !== adminId) {
        throw new Error("You are not authorized to manage slots for this playground.");
    }

    const existing = await Slot.find({
        playground: playground._id,
        isDeleted: false,
        $or: payload.slots.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
        })),
    }).select("dayOfWeek startTime endTime");
    if (existing.length) throw new Error("One or more slots already exist. Review the existing schedule before adding new slots.");

    return Slot.insertMany(payload.slots.map((slot) => ({
        playground: playground._id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: slot.durationMinutes || timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime),
        price: slot.price ?? null,
        isActive: slot.isActive !== undefined ? slot.isActive : true,
    })));
};

// ===================================================
// Get Slots by Playground
// ===================================================

const getSlotsByPlayground = async (playgroundId, adminId) => {
    const playground = await Playground.findOne({
        _id: playgroundId,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    if (playground.playgroundAdmin.toString() !== adminId) {
        throw new Error("You are not authorized to view slots for this playground.");
    }

    const slots = await Slot.find({
        playground: playgroundId,
        isDeleted: false,
    }).sort({ dayOfWeek: 1, startTime: 1 });

    // Slots are recurring weekly schedules.  Attach the next live booking to
    // each schedule entry so the venue dashboard can show "Booked" as soon
    // as a customer reserves a matching date and time.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookings = await Booking.find({
        playground: playgroundId,
        bookingDate: { $gte: today },
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        isDeleted: false,
    }).populate("customer", "name").sort({ bookingDate: 1, startTime: 1 });

    return slots.map((slot) => {
        const booking = bookings.find((item) =>
            new Date(item.bookingDate).getDay() === slot.dayOfWeek
            && item.startTime === slot.startTime
            && item.endTime === slot.endTime
        );
        return {
            ...slot.toObject(),
            bookingStatus: booking ? "Booked" : "Available",
            isBooked: Boolean(booking),
            bookingDate: booking?.bookingDate || null,
            bookedBy: booking?.customer?.name || null,
        };
    });
};

// ===================================================
// Update Slot
// ===================================================

const updateSlot = async (slotId, payload, adminId) => {
    const slot = await Slot.findOne({
        _id: slotId,
        isDeleted: false,
    });

    if (!slot) {
        throw new Error("Slot not found.");
    }

    const playground = await Playground.findOne({
        _id: slot.playground,
        isDeleted: false,
    });

    if (playground.playgroundAdmin.toString() !== adminId) {
        throw new Error("You are not authorized to update this slot.");
    }

    assertValidRange({
        startTime: payload.startTime || slot.startTime,
        endTime: payload.endTime || slot.endTime,
        durationMinutes: payload.durationMinutes || slot.durationMinutes,
    });

    const updatedSlot = await Slot.findByIdAndUpdate(
        slotId,
        payload,
        { new: true, runValidators: true }
    );

    return updatedSlot;
};

// Customer facing availability.  It returns every configured slot for the
// requested calendar day and marks it booked if any active booking overlaps.
const getAvailability = async (playgroundId, dateValue) => {
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) throw new Error("A valid booking date is required.");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) throw new Error("Past dates cannot be checked for availability.");

    const playground = await Playground.findOne({ _id: playgroundId, isDeleted: false, isApproved: true, status: "Active" });
    if (!playground) throw new Error("Playground not found or unavailable.");

    const slots = await Slot.find({ playground: playgroundId, dayOfWeek: date.getDay(), isActive: true, isDeleted: false }).sort({ startTime: 1 });
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const bookings = await Booking.find({
        playground: playgroundId,
        bookingDate: { $gte: date, $lt: dayEnd },
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        isDeleted: false,
    }).select("startTime endTime bookingStatus");

    const now = new Date();
    const isToday = date.getTime() === today.getTime();

    return {
        playground: { id: playground._id, name: playground.name, sportType: playground.sportType },
        date: dateValue,
        slots: slots.map((slot) => {
            const booked = bookings.some((booking) => timeToMinutes(booking.startTime) < timeToMinutes(slot.endTime) && timeToMinutes(booking.endTime) > timeToMinutes(slot.startTime));
            const [hour, minute] = String(slot.startTime).split(":").map(Number);
            const startsAt = new Date(date);
            startsAt.setHours(hour, minute, 0, 0);
            const expired = isToday && startsAt <= now;
            return {
                id: slot._id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                durationMinutes: slot.durationMinutes,
                price: slot.price,
                status: booked ? "Booked" : expired ? "Expired" : "Available",
            };
        }),
    };
};

// ===================================================
// Delete Slot
// ===================================================

const deleteSlot = async (slotId, adminId) => {
    const slot = await Slot.findOne({
        _id: slotId,
        isDeleted: false,
    });

    if (!slot) {
        throw new Error("Slot not found.");
    }

    const playground = await Playground.findOne({
        _id: slot.playground,
        isDeleted: false,
    });

    if (playground.playgroundAdmin.toString() !== adminId) {
        throw new Error("You are not authorized to delete this slot.");
    }

    await Slot.findByIdAndUpdate(slotId, { isDeleted: true });

    return slot;
};

// ===================================================
// Export Services
// ===================================================

module.exports = {
    createSlot,
    createSlots,
    getSlotsByPlayground,
    getAvailability,
    updateSlot,
    deleteSlot,
};
