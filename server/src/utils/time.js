/**
 * Small, shared helpers for the HH:mm values used by slots and fixtures.
 * Keeping these in one place prevents string comparisons from leaking into
 * booking, fixture, and scheduler logic.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isValidTime = (value) => typeof value === "string" && TIME_PATTERN.test(value);

const timeToMinutes = (value) => {
    if (!isValidTime(value)) {
        throw new Error("Time must use the HH:mm format.");
    }

    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (value) => {
    const total = Number(value);
    if (!Number.isFinite(total) || total < 0 || total >= 24 * 60) {
        throw new Error("Time is outside the supported day range.");
    }

    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const normalizeDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error("A valid date is required.");
    }

    date.setHours(0, 0, 0, 0);
    return date;
};

const rangesOverlap = (startA, endA, startB, endB) => {
    return timeToMinutes(startA) < timeToMinutes(endB)
        && timeToMinutes(endA) > timeToMinutes(startB);
};

module.exports = {
    isValidTime,
    timeToMinutes,
    minutesToTime,
    normalizeDate,
    rangesOverlap,
};
