/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : chat.model.js
 * Purpose : Chat Model
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        playground: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playground",
            default: null,
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Direct-message fields.  The older playground/customer fields stay
        // in place so existing conversations are not lost, while new chats
        // can also connect a playground admin with a super admin.
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],

        conversationKey: {
            type: String,
            default: null,
            index: true,
        },

        message: {
            type: String,
            required: true,
            trim: true,
        },

        senderRole: {
            type: String,
            enum: ["customer", "admin", "playground-admin", "super-admin", "system"],
            required: true,
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

chatSchema.index({ participants: 1, conversationKey: 1, createdAt: -1 });
chatSchema.index({ conversationKey: 1, senderRole: 1, isDeleted: 1, createdAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
