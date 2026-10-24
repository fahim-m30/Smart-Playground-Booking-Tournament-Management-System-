const Notification = require("./notification.model");

const { emitToUser } = require("../../config/socket");

// Creates or starts the workflow for create notification.
const createNotification = async (payload) => {
    const notification = await Notification.create(payload);
    emitToUser(notification.recipient.toString(), "notification:new", notification);
    return notification;
};

// Retrieves the data needed for get my notifications.
const getMyNotifications = async (userId, limit = 30) => {
    const list = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(Math.min(Math.max(Number(limit) || 30, 1), 100))
        .lean();
    return list.map((n) => ({
        ...n,
        isRead: Boolean(n.readAt),
    }));
};

// Handles the mark read workflow.
const markRead = async (id, userId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: id, recipient: userId },
        { readAt: new Date() },
        { new: true }
    ).lean();
    if (!notification) throw new Error("Notification not found.");
    return { ...notification, isRead: true };
};

// Handles the mark all read workflow.
const markAllRead = async (userId) => {
    return Notification.updateMany({ recipient: userId, readAt: null }, { $set: { readAt: new Date() } });
};

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
