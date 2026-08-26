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
const { bookingStartsAt, calendarDate, dayRange } = require("../utils/scheduleTime");

// ===================================================
// Helpers
// ===================================================

const rangeForCalendarDay = (offset = 0) => dayRange(calendarDate(new Date(), offset));

// ===================================================
// Process Booking Reminders (2 hours before)
// ===================================================

const processBookingReminders = async () => {
    const now = new Date();
    // A job runs every minute; retain a small tolerance for normal process
    // jitter while never issuing a reminder after the slot has started.
    const reminderWindowStart = new Date(now.getTime() - 2 * 60 * 1000);
    const candidateStart = rangeForCalendarDay();
    const candidateEnd = rangeForCalendarDay(2);

    const bookings = await Booking.find({
        bookingDate: { $gte: candidateStart.start, $lt: candidateEnd.start },
        bookingStatus: "Confirmed",
        paymentStatus: "Paid",
        reminderSent: false,
        isDeleted: false,
    });

    for (const booking of bookings) {
        const slotStart = bookingStartsAt(booking.bookingDate, booking.startTime);
        const reminderAt = new Date(slotStart.getTime() - 2 * 60 * 60 * 1000);

        if (reminderAt >= reminderWindowStart && reminderAt <= now && slotStart > now) {
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
    const twoDaysFromNow = rangeForCalendarDay(2);

    const tournaments = await Tournament.find({
        startDate: { $gte: twoDaysFromNow.start, $lt: twoDaysFromNow.end },
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
    const today = rangeForCalendarDay();

    const tournaments = await Tournament.find({
        startDate: { $gte: today.start, $lt: today.end },
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
    const now = new Date();
    const firstCandidate = rangeForCalendarDay();
    const lastCandidate = rangeForCalendarDay(2);
    const matches = await TournamentMatch.find({
        matchDate: { $gte: firstCandidate.start, $lt: lastCandidate.start },
        matchStatus: "Scheduled",
        reminderSent: false,
    }).populate("teamA teamB", "registeredBy teamName");

    for (const match of matches) {
        const matchStart = bookingStartsAt(match.matchDate, match.startTime);
        const reminderAt = new Date(matchStart.getTime() - 6 * 60 * 60 * 1000);
        if (reminderAt > now || reminderAt < new Date(now.getTime() - 2 * 60 * 1000) || matchStart <= now) continue;
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
    const today = rangeForCalendarDay();
    const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: process.env.APP_TIME_ZONE || "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);

    await Booking.updateMany({
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        isDeleted: false,
        bookingDate: { $lt: today.start },
    }, { $set: { bookingStatus: "Completed" } });

    await Booking.updateMany({
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        isDeleted: false,
        bookingDate: { $gte: today.start, $lt: today.end },
        endTime: { $lte: currentTime },
    }, { $set: { bookingStatus: "Completed" } });

    await Tournament.updateMany({
        status: { $nin: ["Completed", "Cancelled"] },
        isDeleted: false,
        endDate: { $lt: today.start },
    }, { $set: { status: "Completed" } });

    await TournamentMatch.updateMany({
        matchStatus: "Scheduled",
        matchDate: { $gte: today.start, $lt: today.end },
        startTime: { $lte: currentTime },
        endTime: { $gt: currentTime },
    }, { $set: { matchStatus: "Live" } });
    await TournamentMatch.updateMany({
        matchStatus: "Live",
        $or: [
            { matchDate: { $lt: today.start } },
            { matchDate: { $gte: today.start, $lt: today.end }, endTime: { $lte: currentTime } },
        ],
    }, { $set: { matchStatus: "Completed" } });
};

// Registration closes two days before kick-off.  At that point an underfilled
// tournament cannot produce a fair fixture, so cancel it once and notify every
// registered captain. Paid registrations are marked for a full refund.
const processUnderfilledTournaments = async () => {
    const today = rangeForCalendarDay();
    const cutoff = rangeForCalendarDay(2);
    const tournaments = await Tournament.find({
        // Catch up after a missed scheduler run instead of relying on one
        // exact calendar-day window.
        startDate: { $gt: today.start, $lte: cutoff.end },
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
        await TournamentMatch.updateMany({
            tournament: tournament._id,
            matchStatus: { $in: ["Scheduled", "Live"] },
        }, { $set: { matchStatus: "Cancelled" } });
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
    const tomorrow = rangeForCalendarDay(1);
    const tournaments = await Tournament.find({
        // Publish precisely on the calendar day before kick-off.
        startDate: { $gte: tomorrow.start, $lt: tomorrow.end },
        status: "Upcoming",
        fixturesPublishedAt: null,
        isDeleted: false,
    });
    for (const tournament of tournaments) {
        const registered = await TournamentTeam.countDocuments({
            tournament: tournament._id,
            paymentStatus: "Paid",
            isDeleted: false,
        });
        if (registered !== tournament.totalTeams) continue;
        try {
            const existingFixtures = await TournamentMatch.exists({ tournament: tournament._id });
            if (!existingFixtures) await generateGroupMatches(tournament._id.toString());
            const teams = await TournamentTeam.find({ tournament: tournament._id, isDeleted: false }).select("registeredBy teamName");
            await Promise.all(teams.filter((team) => team.registeredBy).map((team) => createNotification({
                recipient: team.registeredBy,
                type: "TournamentPublished",
                title: "Your tournament fixtures are ready",
                message: `${tournament.name} starts tomorrow. Your team ${team.teamName} can now view its complete fixture list.`,
                link: "tournament.html",
            })));
            tournament.fixturesPublishedAt = new Date();
            await tournament.save();
        } catch (error) { throw error; }
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
