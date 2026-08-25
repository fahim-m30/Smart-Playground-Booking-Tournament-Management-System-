/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : notificationService.js
 * Purpose : Notification Service (SMS / Dummy)
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Booking = require("../modules/booking/booking.model");
const TournamentTeam = require("../modules/tournament/tournamentTeam.model");
const Tournament = require("../modules/tournament/tournament.model");
const TournamentMatch = require("../modules/tournament/tournamentMatch.model");
const User = require("../modules/user/user.model");
const { createNotification } = require("../modules/notification/notification.service");

// ===================================================
// Send SMS (Dummy)
// ===================================================
// Replace this function body with real SMS provider
// (SSL Wireless, Twilio, etc.) when credentials are ready.

const sendSMS = async (phone, message) => {
    if (!phone) return;

    console.log("=================================");
    console.log("📱 DUMMY SMS");
    console.log("To:", phone);
    console.log("Message:", message);
    console.log("=================================");

    // TODO: Replace with real SMS API call
    // Example:
    // await axios.post("https://smsapi.com/send", {
    //     api_key: process.env.SMS_API_KEY,
    //     type: "text",
    //     number: phone,
    //     senderid: "SMART TURF",
    //     message: message,
    // });
};

// ===================================================
// Booking Confirmation SMS
// ===================================================

const sendBookingConfirmation = async (bookingId) => {
    const booking = await Booking.findById(bookingId)
        .populate("customer", "name phone")
        .populate("playground", "name");

    if (!booking) return;

    const customer = booking.customer;
    if (!customer || !customer.phone) return;

    const message =
        `Dear ${customer.name}, your slot at ${booking.playground?.name || "the playground"} ` +
        `on ${booking.bookingDate.toISOString().split("T")[0]} ` +
        `from ${booking.startTime} to ${booking.endTime} has been confirmed. ` +
        `Amount: BDT ${booking.totalAmount}. Show your QR code at the venue. Thank you!`;

    await Promise.all([
        sendSMS(customer.phone, message),
        createNotification({ recipient: customer._id, type: "BookingConfirmed", title: "Booking confirmed", message, link: "booking.html" }),
    ]);
};

// ===================================================
// Booking Reminder SMS (2 hours before)
// ===================================================

const sendBookingReminder = async (bookingId) => {
    const booking = await Booking.findById(bookingId)
        .populate("customer", "name phone")
        .populate("playground", "name");

    if (!booking) return;

    const customer = booking.customer;
    if (!customer || !customer.phone) return;

    const message =
        `Reminder: Your slot at ${booking.playground?.name || "the playground"} ` +
        `is in 2 hours (${booking.startTime} - ${booking.endTime}). ` +
        `Please bring your QR code. Thank you!`;

    await Promise.all([
        sendSMS(customer.phone, message),
        createNotification({ recipient: customer._id, type: "BookingReminder", title: "Your slot starts in 2 hours", message, link: "booking.html" }),
    ]);
};

// ===================================================
// Tournament Notification (Start / Reminder)
// ===================================================

const sendTournamentNotification = async (tournamentId, type) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return;

    const teams = await TournamentTeam.find({
        tournament: tournamentId,
        paymentStatus: "Paid",
    }).populate("tournament", "name");

    if (teams.length === 0) return;

    const tournamentName = tournament.name;
    const startDate = tournament.startDate.toISOString().split("T")[0];
    const matches = type === "reminder" ? await TournamentMatch.find({ tournament: tournamentId })
        .populate("teamA", "teamName")
        .populate("teamB", "teamName")
        .populate("group", "name")
        .sort({ matchDate: 1, startTime: 1 }) : [];

    let message = "";

    if (type === "reminder") {
        message =
            `Reminder: Tournament "${tournamentName}" starts in 2 days (${startDate}). ` +
            `Your complete match schedule is included below.`;
    } else if (type === "start") {
        message =
            `Dear participant, tournament "${tournamentName}" has started today (${startDate}). ` +
            `Check your fixtures and bring your QR ticket to the venue. Best of luck!`;
    } else {
        return;
    }

    for (const team of teams) {
        const teamFixtures = matches.filter((match) =>
            String(match.teamA?._id) === String(team._id) || String(match.teamB?._id) === String(team._id)
        );
        const fixtureText = teamFixtures.length
            ? teamFixtures.map((match, index) => {
                const opponent = String(match.teamA?._id) === String(team._id) ? match.teamB?.teamName : match.teamA?.teamName;
                const date = new Date(match.matchDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                return `${index + 1}. ${date}, ${match.startTime}-${match.endTime}: ${team.teamName} vs ${opponent}${match.group?.name ? ` (${match.group.name})` : ""}`;
            }).join("\n")
            : "Fixtures are being finalized and will appear in the tournament centre.";
        const fullMessage = `${message}\n\n${fixtureText}`;
        if (team.contactNumber) {
            await sendSMS(team.contactNumber, fullMessage);
        }

        if (team.registeredBy) {
            await createNotification({
                recipient: team.registeredBy,
                type: type === "reminder" ? "TournamentReminder" : "TournamentPublished",
                title: type === "reminder" ? "Tournament starts in 2 days" : "Tournament is starting today",
                message: fullMessage,
                link: "tournament.html",
            });
        }

    }
};

// ===================================================
// Export Services
// ===================================================

module.exports = {
    sendSMS,
    sendBookingConfirmation,
    sendBookingReminder,
    sendTournamentNotification,
};
