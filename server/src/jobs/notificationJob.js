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
const Payment = require("../modules/payment/payment.model");
const { createNotification } = require("../modules/notification/notification.service");
const { sendBookingReminder, sendTournamentNotification } = require("../utils/notificationService");
const { generateGroupMatches } = require("../modules/tournament/tournament.service");

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
    const reminderWindowStart = new Date(now.getTime() + 115 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 125 * 60 * 1000);
    const lastRelevantDayEnd = endOfDay(reminderWindowEnd);

    const bookings = await Booking.find({
        bookingDate: { $gte: todayStart, $lt: lastRelevantDayEnd },
        bookingStatus: "Confirmed",
        paymentStatus: "Paid",
        reminderSent: false,
        isDeleted: false,
    });

    for (const booking of bookings) {
        const [hour, minute] = booking.startTime.split(":").map(Number);
        const slotStart = new Date(booking.bookingDate);
        slotStart.setHours(hour, minute, 0, 0);

        if (slotStart >= reminderWindowStart && slotStart <= reminderWindowEnd) {
            await sendBookingReminder(booking._id.toString());

            booking.reminderSent = true;
            await booking.save();
        }
    }
};

// ===================================================
// Process Tournament Reminders (2 days before)
// ===================================================

const processTournamentReminders = async () => {
    const todayStart = startOfDay(new Date());
    const twoDaysFromNowStart = startOfDay(new Date());
    twoDaysFromNowStart.setDate(twoDaysFromNowStart.getDate() + 2);
    const twoDaysFromNowEnd = endOfDay(twoDaysFromNowStart);

    const tournaments = await Tournament.find({
        startDate: { $gte: twoDaysFromNowStart, $lt: twoDaysFromNowEnd },
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

    await TournamentMatch.updateMany({
        matchStatus: "Scheduled",
        matchDate: { $gte: todayStart, $lt: endOfDay(todayStart) },
        startTime: { $lte: currentTime },
        endTime: { $gt: currentTime },
    }, { $set: { matchStatus: "Live" } });
    await TournamentMatch.updateMany({
        matchStatus: "Live",
        $or: [
            { matchDate: { $lt: todayStart } },
            { matchDate: { $gte: todayStart, $lt: endOfDay(todayStart) }, endTime: { $lte: currentTime } },
        ],
    }, { $set: { matchStatus: "Completed" } });
};

// Registration closes two days before kick-off.  At that point an underfilled
// tournament cannot produce a fair fixture, so cancel it once and notify every
// registered captain. Paid registrations are marked for a full refund.
const processUnderfilledTournaments = async () => {
    const cutoffStart = startOfDay(new Date());
    cutoffStart.setDate(cutoffStart.getDate() + 2);
    const cutoffEnd = endOfDay(cutoffStart);
    const tournaments = await Tournament.find({
        startDate: { $gte: cutoffStart, $lt: cutoffEnd },
        status: "Upcoming",
        cancellationProcessed: { $ne: true },
        isDeleted: false,
    });
    for (const tournament of tournaments) {
        const teams = await TournamentTeam.find({ tournament: tournament._id, isDeleted: false }).select("registeredBy teamName");
        if (teams.length >= tournament.totalTeams) continue;
        tournament.status = "Cancelled";
        tournament.cancellationProcessed = true;
        await tournament.save();
        const payments = await Payment.find({ tournament: tournament._id, paymentStatus: "Paid", isDeleted: false });
        await Promise.all(payments.map((payment) => Payment.updateOne({ _id: payment._id }, {
            $set: { refundAmount: payment.amount, refundStatus: "Pending", refundReason: "Tournament cancelled because required teams were not registered." },
        })));
        await Promise.all(teams.filter((team) => team.registeredBy).map(async (team) => {
            const payment = payments.find((item) => String(item.tournamentTeam) === String(team._id));
            await createNotification({
                recipient: team.registeredBy,
                type: "TournamentCancelled",
                title: "Tournament cancelled",
                message: `${tournament.name} was cancelled because only ${teams.length} of ${tournament.totalTeams} required teams registered.${payment ? ` A refund of ৳${payment.amount} is being processed.` : ""}`,
                link: "tournament.html",
            });
        }));
    }
};

// Fixtures are deliberately released one day before kick-off, once every
// registered team is known. This gives participants their complete FIFA-style
// group schedule without exposing a provisional draw weeks earlier.
const processFixturePublication = async () => {
    const tomorrowStart = startOfDay(new Date());
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = endOfDay(tomorrowStart);
    const tournaments = await Tournament.find({
        startDate: { $gte: tomorrowStart, $lt: tomorrowEnd },
        status: "Upcoming",
        isDeleted: false,
    });
    for (const tournament of tournaments) {
        const registered = await TournamentTeam.countDocuments({ tournament: tournament._id, isDeleted: false });
        if (registered !== tournament.totalTeams) continue;
        try {
            await generateGroupMatches(tournament._id.toString());
            const teams = await TournamentTeam.find({ tournament: tournament._id, isDeleted: false }).select("registeredBy teamName");
            await Promise.all(teams.filter((team) => team.registeredBy).map((team) => createNotification({
                recipient: team.registeredBy,
                type: "TournamentPublished",
                title: "Your tournament fixtures are ready",
                message: `${tournament.name} starts tomorrow. Your team ${team.teamName} can now view its complete fixture list.`,
                link: "tournament.html",
            })));
        } catch (error) {
            if (!String(error.message).includes("already been generated")) throw error;
        }
    }
};

// ===================================================
// Run All Notification Jobs
// ===================================================

const runNotificationJobs = async () => {
    try {
        await processBookingReminders();
        await processTournamentReminders();
        await processUnderfilledTournaments();
        await processTournamentStartNotifications();
        await processFixturePublication();
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
