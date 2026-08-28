/**
 * Time helpers for date-only bookings and tournaments.
 *
 * Dates selected in the TURF UI represent a Bangladesh calendar day. MongoDB
 * stores those date-only values at UTC midnight, so they must never be joined
 * with a clock value using the host server's local timezone.
 */

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Dhaka";

const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));

const zonedParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date).reduce((result, part) => {
        if (part.type !== "literal") result[part.type] = Number(part.value);
        return result;
    }, {});

    return parts;
};

const calendarDate = (date = new Date(), daysToAdd = 0) => {
    const { year, month, day } = zonedParts(date);
    const shifted = new Date(Date.UTC(year, month - 1, day + daysToAdd));
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
};

const dayRange = ({ year, month, day }) => ({
    start: new Date(Date.UTC(year, month - 1, day)),
    end: new Date(Date.UTC(year, month - 1, day + 1)),
});

const dateOnlyParts = (date) => ({
    year: new Date(date).getUTCFullYear(),
    month: new Date(date).getUTCMonth() + 1,
    day: new Date(date).getUTCDate(),
});

// Convert a wall-clock time in APP_TIME_ZONE to its actual UTC instant.
const zonedDateTime = ({ year, month, day }, time) => {
    if (!validTime(time)) throw new Error("Time must use the HH:mm format.");
    const [hour, minute] = time.split(":").map(Number);
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const parts = zonedParts(new Date(utcGuess));
    const offsetMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - utcGuess;
    return new Date(utcGuess - offsetMs);
};

const bookingStartsAt = (bookingDate, startTime) => zonedDateTime(dateOnlyParts(bookingDate), startTime);

// Tournament dates represent Bangladesh calendar days.  A 30 August event,
// for example, accepts registrations through 27 August and closes at the
// first minute of 28 August.
const tournamentRegistrationClosesAt = (startDate) => {
    const start = dateOnlyParts(startDate);
    const closingDay = new Date(Date.UTC(start.year, start.month - 1, start.day - 2));
    return zonedDateTime({
        year: closingDay.getUTCFullYear(),
        month: closingDay.getUTCMonth() + 1,
        day: closingDay.getUTCDate(),
    }, "00:00");
};

module.exports = {
    APP_TIME_ZONE,
    bookingStartsAt,
    calendarDate,
    dateOnlyParts,
    dayRange,
    tournamentRegistrationClosesAt,
    zonedDateTime,
};
