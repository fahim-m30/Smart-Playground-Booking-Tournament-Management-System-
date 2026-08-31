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
const TournamentGroup = require("../modules/tournament/tournamentGroup.model");
const TournamentTeam = require("../modules/tournament/tournamentTeam.model");
const TournamentMatch = require("../modules/tournament/tournamentMatch.model");
const Payment = require("../modules/payment/payment.model");
const Playground = require("../modules/playground/playground.model");
const { createNotification } = require("../modules/notification/notification.service");
const { sendBookingReminder, sendSMS, sendTournamentNotification } = require("../utils/notificationService");
const { generateGroupMatches, resumeLiveTournamentDraws } = require("../modules/tournament/tournament.service");
const { bookingStartsAt, calendarDate, dayRange } = require("../utils/scheduleTime");
const { emitDashboardUpdate } = require("../config/socket");

// A run can take longer than one minute when an external SMS provider is
// slow. Prevent an overlapping run from sending the same reminder twice.
let notificationJobsRunning = false;

// ===================================================
// Helpers
// ===================================================

const rangeForCalendarDay = (offset = 0) => dayRange(calendarDate(new Date(), offset));

// ===================================================
// Process Booking Reminders (2 hours before)
// ===================================================

const processBookingReminders = async () => {
    const now = new Date();
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

        // A deployment, server restart, or sleeping host can miss the exact
        // two-hour minute.  Deliver one catch-up reminder while the slot is
        // still upcoming instead of silently losing it forever.
        if (reminderAt <= now && slotStart > now) {
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
    const now = new Date();
    const today = rangeForCalendarDay();

    const tournaments = await Tournament.find({
        // A fixture may be rescheduled within the tournament window, so use
        // the first playable match—not midnight on the tournament date—as
        // the actual start of the tournament.
        startDate: { $lte: today.end },
        endDate: { $gte: today.start },
        status: { $nin: ["Completed", "Cancelled"] },
        startNotificationSent: false,
        isDeleted: false,
    });

    for (const tournament of tournaments) {
        const firstMatch = await TournamentMatch.findOne({
            tournament: tournament._id,
            matchStatus: { $ne: "Cancelled" },
        }).sort({ matchDate: 1, startTime: 1 });

        // Fixtures are published before the tournament begins. If there is
        // no playable opening match yet, keep the notification pending.
        if (!firstMatch || bookingStartsAt(firstMatch.matchDate, firstMatch.startTime) > now) continue;

        await sendTournamentNotification(tournament._id.toString(), "start", firstMatch);

        tournament.startNotificationSent = true;
        // The event is now in progress.  This avoids a stale "Upcoming"
        // label when the scheduler is the only code touching the record.
        if (tournament.status === "Upcoming") tournament.status = "Group Stage";
        await tournament.save();
    }
};

// ===================================================
// Official Lottery Reminder (2 hours before live draw)
// ===================================================

const processTournamentDrawReminders = async () => {
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const tournaments = await Tournament.find({
        status: "Upcoming",
        drawStatus: "Scheduled",
        drawNotificationSent: false,
        drawScheduledAt: { $gt: now, $lte: reminderWindow },
        isDeleted: false,
    });

    for (const tournament of tournaments) {
        const teams = await TournamentTeam.find({
            tournament: tournament._id,
            paymentStatus: "Paid",
            registeredBy: { $ne: null },
            isDeleted: false,
        }).select("registeredBy teamName");
        const drawTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true }).format(tournament.drawScheduledAt);
        await Promise.all(teams.map((team) => createNotification({
            recipient: team.registeredBy,
            type: "TournamentDrawReminder",
            title: "Official group lottery starts in 2 hours",
            message: `${tournament.name} group draw goes live at ${drawTime}. Your team will be randomly placed; the final fixture follows immediately after the draw.`,
            link: `tournament.html?fixture=${tournament._id}`,
        })));
        tournament.drawNotificationSent = true;
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
    // A match remains Live after its scheduled end time until the venue admin
    // records the final result. This prevents an unverified result from being
    // treated as completed and keeps the next fixture from replacing it.
};

// Registration closes two calendar days before kick-off. An event may proceed
// below its advertised capacity, but it needs four paid teams for a fair draw.
const processUnderfilledTournaments = async () => {
    const today = rangeForCalendarDay();
    const cutoff = rangeForCalendarDay(1);
    const tournaments = await Tournament.find({
        // Catch up after a missed scheduler run instead of relying on one
        // exact calendar-day window.
        startDate: { $gt: today.start, $lte: cutoff.end },
        status: "Upcoming",
        cancellationProcessed: { $ne: true },
        isDeleted: false,
    });
    for (const tournament of tournaments) {
        const teams = await TournamentTeam.find({ tournament: tournament._id, paymentStatus: "Paid", isDeleted: false }).select("registeredBy teamName contactNumber");
        if (teams.length >= 4) continue;
        tournament.status = "Cancelled";
        tournament.cancellationProcessed = true;
        tournament.cancelledAt = new Date();
        await tournament.save();
        await TournamentMatch.updateMany({
            tournament: tournament._id,
            matchStatus: { $in: ["Scheduled", "Live"] },
        }, { $set: { matchStatus: "Cancelled" } });
        const payments = await Payment.find({ tournament: tournament._id, paymentStatus: "Paid", isDeleted: false });
        await Promise.all(payments.map((payment) => Payment.updateOne({ _id: payment._id }, {
            $set: { refundAmount: payment.amount, refundStatus: "Pending", refundReason: "Tournament cancelled because required teams were not registered." },
        })));
        const playground = await Playground.findById(tournament.playground).select("playgroundAdmin");
        if (playground?.playgroundAdmin) {
            await createNotification({
                recipient: playground.playgroundAdmin,
                type: "TournamentCancelled",
                title: "Tournament cancelled",
                message: `${tournament.name} was cancelled because only ${teams.length} paid team(s) registered; at least 4 are required. Registered teams will be refunded.`,
                link: "tournament.html",
            });
        }
        await Promise.all(teams.filter((team) => team.registeredBy).map(async (team) => {
            const payment = payments.find((item) => String(item.tournamentTeam) === String(team._id));
            const sms = `${tournament.name} was cancelled because fewer than 4 paid teams registered.${payment ? ` Your refund of BDT ${payment.amount} is being processed.` : ""}`;
            if (team.contactNumber) await sendSMS(team.contactNumber, sms);
            await createNotification({
                recipient: team.registeredBy,
                type: "TournamentCancelled",
                title: "Tournament cancelled",
                message: `${tournament.name} was cancelled because only ${teams.length} of ${tournament.totalTeams} required paid teams completed registration.${payment ? ` A refund of ৳${payment.amount} is being processed.` : ""}`,
                link: "tournament.html",
            });
        }));
    }
};

// A cancelled event remains visible for 48 hours so organisers and customers
// can read its cancellation/refund notice. Then all event-owned data is
// permanently deleted, which also removes it from every server/UI listing.
const processCancelledTournamentDeletion = async () => {
    const expiresAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const tournaments = await Tournament.find({
        status: "Cancelled",
        isDeleted: false,
        $or: [
            { cancelledAt: { $lte: expiresAt } },
            // Legacy cancelled records did not store the precise time. Their
            // last update is the closest reliable retention timestamp.
            { cancelledAt: null, updatedAt: { $lte: expiresAt } },
        ],
    }).select("_id playground venueApprovalStatus");

    for (const tournament of tournaments) {
        const tournamentId = tournament._id;
        await Promise.all([
            Payment.deleteMany({ tournament: tournamentId }),
            TournamentMatch.deleteMany({ tournament: tournamentId }),
            TournamentTeam.deleteMany({ tournament: tournamentId }),
            TournamentGroup.deleteMany({ tournament: tournamentId }),
        ]);
        await Tournament.deleteOne({ _id: tournamentId });

        // Rejected venue requests never increased this count, whereas every
        // approved/normal tournament did.
        if (["Approved", "Not Required"].includes(tournament.venueApprovalStatus)) {
            await Playground.updateOne(
                { _id: tournament.playground, tournamentCount: { $gt: 0 } },
                { $inc: { tournamentCount: -1 } }
            );
        }
    }

    if (tournaments.length) emitDashboardUpdate({ type: "tournament:deleted", count: tournaments.length });
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
        if (registered < 4) continue;
        try {
            const existingFixtures = await TournamentMatch.exists({ tournament: tournament._id });
            if (!existingFixtures) await generateGroupMatches(tournament._id.toString());
            const teams = await TournamentTeam.find({
                tournament: tournament._id,
                paymentStatus: "Paid",
                registeredBy: { $ne: null },
                isDeleted: false,
            }).select("registeredBy teamName contactNumber");
            await Promise.all(teams.map(async (team) => {
                const message = `The final fixture for ${tournament.name} is ready. Review ${team.teamName}'s match schedule, then join the tournament at the venue with your QR ticket.`;
                await Promise.all([
                    team.contactNumber ? sendSMS(team.contactNumber, message) : Promise.resolve(),
                    createNotification({
                        recipient: team.registeredBy,
                        type: "TournamentPublished",
                        title: "Final fixture ready: join the tournament tomorrow",
                        message,
                        link: `tournament.html?fixture=${tournament._id}`,
                    }),
                ]);
            }));
            tournament.fixturesPublishedAt = new Date();
            await tournament.save();
        } catch (error) { throw error; }
    }
};

// ===================================================
// Run All Notification Jobs
// ===================================================

const runNotificationJobs = async () => {
    if (notificationJobsRunning) return;
    notificationJobsRunning = true;
    try {
        await resumeLiveTournamentDraws();
        await processBookingReminders();
        await processTournamentReminders();
        await processTournamentDrawReminders();
        await processUnderfilledTournaments();
        await processCancelledTournamentDeletion();
        await processTournamentStartNotifications();
        await processMatchReminders();
        await processExpiredSchedule();
    } catch (error) {
        console.error("❌ Notification Job Error:", error.message);
    } finally {
        notificationJobsRunning = false;
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
