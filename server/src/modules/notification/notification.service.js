const Notification = require("./notification.model");

const { emitToUser } = require("../../config/socket");

// Creates or starts the workflow for create notification.
const createNotification = async (payload) => {
    const notification = await Notification.create(payload);
    emitToUser(notification.recipient.toString(), "notification:new", notification);
    return notification;
};

// Retrieves the data needed for get my notifications.
const getMyNotifications = (userId, limit = 30) => Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 30, 1), 100));

// Handles the mark read workflow.
const markRead = async (id, userId) => {
    const notification = await Notification.findOneAndUpdate({ _id: id, recipient: userId }, { readAt: new Date() }, { new: true });
    if (!notification) throw new Error("Notification not found.");
    return notification;
};

// Handles the mark all read workflow.
const markAllRead = (userId) => Notification.updateMany({ recipient: userId, readAt: null }, { readAt: new Date() });

// Removes or cancels the data used for delete notification.
const deleteNotification = async (id, userId) => {
    // recipient is part of the query, so no user can delete another user's
    // notification even if they know its database id.
    const notification = await Notification.findOneAndDelete({ _id: id, recipient: userId });
    if (!notification) throw new Error("Notification not found.");
    emitToUser(String(userId), "notification:deleted", { notificationId: String(id) });
    return notification;
};

module.exports = { createNotification, getMyNotifications, markRead, markAllRead, deleteNotification };
