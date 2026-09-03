const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
        type: String,
        // Keep this list in sync with every createNotification call. An
        // unknown type makes Mongoose reject the notification entirely.
        enum: [
            "BookingConfirmed",
            "BookingReminder",
            "BookingCancelled",
            "TournamentRegistrationConfirmed",
            "TournamentRegistrationCancelled",
            "TournamentPublished",
            "TournamentReminder",
            "TournamentCancelled",
            "TournamentApprovalRequired",
            "VenueApprovalRequired",
            "TournamentPlatformApproval",
            "TournamentDrawReminder",
            "TournamentDrawCompleted",
            "MatchReminder",
            "MatchCancelled",
            "ReportUpdate",
            "AccountSuspended",
            "VenueApproval",
            "ChatMessage",
            "ChatHandoff",
        ],
        required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
