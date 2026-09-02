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
const { bookingStartsAt, calendarDate, dayRange } = require("../../utils/scheduleTime");

const timeToMinutes = (time) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) return NaN;
    const [hour, minute] = String(time).split(":").map(Number);
    return hour * 60 + minute;
};

const overlaps = (first, second) =>
    timeToMinutes(first.startTime) < timeToMinutes(second.endTime)
    && timeToMinutes(first.endTime) > timeToMinutes(second.startTime);

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

const assertValidBreak = ({ breakStartTime, breakEndTime }) => {
    if (!breakStartTime && !breakEndTime) return;
    if (!breakStartTime || !breakEndTime || timeToMinutes(breakEndTime) <= timeToMinutes(breakStartTime)) {
        throw new Error("Provide a valid break start and end time, or leave both break fields empty.");
    }
};

// ===================================================
// Create Slot
// ===================================================

const createSlot = async (payload, adminId) => {
    assertValidRange(payload);
    assertValidBreak(payload);
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

    const existingSlots = await Slot.find({
        playground: payload.playground,
        dayOfWeek: payload.dayOfWeek,
        isDeleted: false,
    });

    if (existingSlots.some((slot) => overlaps(slot, payload))) {
        throw new Error("This slot overlaps an existing slot for the selected day.");
    }

    const slot = await Slot.create({
        playground: payload.playground,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        durationMinutes: payload.durationMinutes || timeToMinutes(payload.endTime) - timeToMinutes(payload.startTime),
        breakStartTime: payload.breakStartTime || null,
        breakEndTime: payload.breakEndTime || null,
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
        assertValidBreak(slot);
        const key = `${slot.playground}:${slot.dayOfWeek}:${slot.startTime}:${slot.endTime}`;
        if (keys.has(key)) throw new Error("Your schedule contains duplicate slots.");
        keys.add(key);
    }

    for (let index = 0; index < payload.slots.length; index += 1) {
        for (let compareIndex = index + 1; compareIndex < payload.slots.length; compareIndex += 1) {
            const first = payload.slots[index];
            const second = payload.slots[compareIndex];
            if (String(first.playground) === String(second.playground) && first.dayOfWeek === second.dayOfWeek && overlaps(first, second)) {
                throw new Error("Your schedule contains overlapping slots.");
            }
        }
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
    }).select("dayOfWeek startTime endTime");
    if (payload.slots.some((slot) => existing.some((saved) => saved.dayOfWeek === slot.dayOfWeek && overlaps(saved, slot)))) {
        throw new Error("One or more slots overlap an existing schedule. Review existing slots before creating new ones.");
    }

    return Slot.insertMany(payload.slots.map((slot) => ({
        playground: playground._id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: slot.durationMinutes || timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime),
        breakStartTime: slot.breakStartTime || null,
        breakEndTime: slot.breakEndTime || null,
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
    assertValidBreak({
        breakStartTime: payload.breakStartTime ?? slot.breakStartTime,
        breakEndTime: payload.breakEndTime ?? slot.breakEndTime,
    });

    const proposed = {
        dayOfWeek: payload.dayOfWeek ?? slot.dayOfWeek,
        startTime: payload.startTime ?? slot.startTime,
        endTime: payload.endTime ?? slot.endTime,
    };
    const conflicts = await Slot.find({
        playground: slot.playground,
        _id: { $ne: slotId },
        dayOfWeek: proposed.dayOfWeek,
        isDeleted: false,
    }).select("startTime endTime");
    if (conflicts.some((other) => overlaps(other, proposed))) {
        throw new Error("This update would overlap an existing slot.");
    }

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
    const date = new Date(`${dateValue}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new Error("A valid booking date is required.");
    const today = dayRange(calendarDate());
    if (date < today.start) throw new Error("Past dates cannot be checked for availability.");

    const playground = await Playground.findOne({ _id: playgroundId, isDeleted: false, isApproved: true, status: "Active" });
    if (!playground) throw new Error("Playground not found or unavailable.");

    const slots = await Slot.find({ playground: playgroundId, dayOfWeek: date.getUTCDay(), isActive: true, isDeleted: false }).sort({ startTime: 1 });
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const bookings = await Booking.find({
        playground: playgroundId,
        bookingDate: { $gte: date, $lt: dayEnd },
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        isDeleted: false,
    }).select("startTime endTime bookingStatus");

    const now = new Date();
    const isToday = date.getTime() === today.start.getTime();

    return {
        playground: { id: playground._id, name: playground.name, sportType: playground.sportType },
        date: dateValue,
        slots: slots.map((slot) => {
            const booked = bookings.some((booking) => timeToMinutes(booking.startTime) < timeToMinutes(slot.endTime) && timeToMinutes(booking.endTime) > timeToMinutes(slot.startTime));
            const startsAt = bookingStartsAt(date, slot.startTime);
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
