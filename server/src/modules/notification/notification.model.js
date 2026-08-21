const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
        type: String,
        enum: ["BookingConfirmed", "BookingReminder", "TournamentPublished", "TournamentReminder", "MatchReminder", "MatchCancelled", "AccountSuspended", "VenueApproval", "ChatMessage"],
        required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
