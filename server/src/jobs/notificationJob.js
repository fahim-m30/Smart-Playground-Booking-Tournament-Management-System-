/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : notificationJob.js
 * Purpose : Notification Scheduler
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Booking = require("../modules/booking/booking.model");
const Tournament = require("../modules/tournament/tournament.model");
const TournamentTeam = require("../modules/tournament/tournamentTeam.model");
const TournamentMatch = require("../modules/tournament/tournamentMatch.model");
const { createNotification } = require("../modules/notification/notification.service");
const { sendBookingReminder, sendTournamentNotification } = require("../utils/notificationService");

// ===================================================
// Helpers
// ===================================================

const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
};

const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (date) => {
    const d = startOfDay(date);
    d.setDate(d.getDate() + 1);
    return d;
};

// ===================================================
// Process Booking Reminders (2 hours before)
// ===================================================

const processBookingReminders = async () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = currentMinutes + 120;

    const bookings = await Booking.find({
        bookingDate: { $gte: todayStart, $lt: todayEnd },
        bookingStatus: "Confirmed",
        paymentStatus: "Paid",
        reminderSent: false,
        isDeleted: false,
    });

    for (const booking of bookings) {
        const slotStartMinutes = timeToMinutes(booking.startTime);
        const diffMinutes = slotStartMinutes - targetMinutes;

        if (diffMinutes >= -5 && diffMinutes <= 5) {
            await sendBookingReminder(booking._id.toString());

            booking.reminderSent = true;
            await booking.save();
        }
    }
};

// ===================================================
// Process Tournament Reminders (1 day before)
// ===================================================

const processTournamentReminders = async () => {
    const todayStart = startOfDay(new Date());
    const tomorrowStart = startOfDay(new Date());
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = endOfDay(tomorrowStart);

    const tournaments = await Tournament.find({
        startDate: { $gte: tomorrowStart, $lt: tomorrowEnd },
        status: { $nin: ["Completed", "Cancelled"] },
        reminderSent: false,
        isDeleted: false,
    });

    for (const tournament of tournaments) {
        await sendTournamentNotification(tournament._id.toString(), "reminder");

        tournament.reminderSent = true;
        await tournament.save();
    }
};

// ===================================================
// Process Tournament Start Notifications
// ===================================================

const processTournamentStartNotifications = async () => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const tournaments = await Tournament.find({
        startDate: { $gte: todayStart, $lt: todayEnd },
        status: { $nin: ["Completed", "Cancelled"] },
        startNotificationSent: false,
        isDeleted: false,
    });

    for (const tournament of tournaments) {
        await sendTournamentNotification(tournament._id.toString(), "start");

        tournament.startNotificationSent = true;
        await tournament.save();
    }
};

const processMatchReminders = async () => {
    const target = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const dayStart = startOfDay(target);
    const dayEnd = endOfDay(target);
    const targetMinutes = target.getHours() * 60 + target.getMinutes();
    const matches = await TournamentMatch.find({
        matchDate: { $gte: dayStart, $lt: dayEnd },
        matchStatus: "Scheduled",
        reminderSent: false,
    }).populate("teamA teamB", "registeredBy teamName");

    for (const match of matches) {
        if (Math.abs(timeToMinutes(match.startTime) - targetMinutes) > 5) continue;
        for (const team of [match.teamA, match.teamB]) {
            if (team?.registeredBy) {
                await createNotification({
                    recipient: team.registeredBy,
                    type: "MatchReminder",
                    title: "Match starts in 6 hours",
                    message: `${team.teamName}'s match is scheduled at ${match.startTime}. Please arrive early with your QR ticket.`,
                    link: "tournament.html",
                });
            }
        }
        match.reminderSent = true;
        await match.save();
    }
};

// Keep dashboard activity current.  Completed records stay in the database
// for receipts and history, but no longer appear as live slots or events.
const processExpiredSchedule = async () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    await Booking.updateMany({
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        isDeleted: false,
        bookingDate: { $lt: todayStart },
    }, { $set: { bookingStatus: "Completed" } });

    await Booking.updateMany({
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        isDeleted: false,
        bookingDate: { $gte: todayStart, $lt: endOfDay(todayStart) },
        endTime: { $lte: currentTime },
    }, { $set: { bookingStatus: "Completed" } });

    await Tournament.updateMany({
        status: { $nin: ["Completed", "Cancelled"] },
        isDeleted: false,
        endDate: { $lt: todayStart },
    }, { $set: { status: "Completed" } });
};

// ===================================================
// Run All Notification Jobs
// ===================================================

const runNotificationJobs = async () => {
    try {
        await processBookingReminders();
        await processTournamentReminders();
        await processTournamentStartNotifications();
        await processMatchReminders();
        await processExpiredSchedule();
    } catch (error) {
        console.error("❌ Notification Job Error:", error.message);
    }
};

// ===================================================
// Start Scheduler
// ===================================================

const startNotificationScheduler = () => {
    console.log("📬 Notification Scheduler Started (every 1 minute)");

    runNotificationJobs();

    setInterval(runNotificationJobs, 60 * 1000);
};

// ===================================================
// Export
// ===================================================

module.exports = {
    startNotificationScheduler,
    runNotificationJobs,
};
