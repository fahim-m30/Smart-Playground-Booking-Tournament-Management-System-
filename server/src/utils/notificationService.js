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
    if (!customer) return;

    const message =
        `Dear ${customer.name}, your slot at ${booking.playground?.name || "the playground"} ` +
        `on ${booking.bookingDate.toISOString().split("T")[0]} ` +
        `from ${booking.startTime} to ${booking.endTime} has been confirmed. ` +
        `Amount: BDT ${booking.totalAmount}. Show your QR code at the venue. Thank you!`;

    await Promise.all([
        customer.phone ? sendSMS(customer.phone, message) : Promise.resolve(),
        createNotification({ recipient: customer._id, type: "BookingConfirmed", title: "Booking confirmed", message, link: "booking.html" }),
    ]);
};

// ===================================================
// Booking Reminder SMS
// ===================================================

const sendBookingReminder = async (bookingId) => {
    const booking = await Booking.findById(bookingId)
        .populate("customer", "name phone")
        .populate("playground", "name");

    if (!booking) return;

    const customer = booking.customer;
    if (!customer) return;

    const message =
        `Reminder: Your slot at ${booking.playground?.name || "the playground"} ` +
        `starts at ${booking.startTime} (${booking.startTime} - ${booking.endTime}). ` +
        `Please bring your QR code. Thank you!`;

    await Promise.all([
        customer.phone ? sendSMS(customer.phone, message) : Promise.resolve(),
        createNotification({ recipient: customer._id, type: "BookingReminder", title: "Your slot starts soon", message, link: "booking.html" }),
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
        registeredBy: { $ne: null },
        isDeleted: false,
    }).populate("tournament", "name");

    if (teams.length === 0) return;

    const tournamentName = tournament.name;
    const startDate = tournament.startDate.toISOString().split("T")[0];
    let message = "";

    if (type === "reminder") {
        message =
            `Reminder: Tournament "${tournamentName}" starts in 2 days (${startDate}). ` +
            `Final fixtures will be published here one day before kick-off.`;
    } else if (type === "start") {
        message =
            `Dear participant, tournament "${tournamentName}" has started today (${startDate}). ` +
            `Check your fixtures and bring your QR ticket to the venue. Best of luck!`;
    } else {
        return;
    }

    for (const team of teams) {
        const fullMessage = message;
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
