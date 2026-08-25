const Notification = require("./notification.model");

const { emitToUser } = require("../../config/socket");

const createNotification = async (payload) => {
    const notification = await Notification.create(payload);
    emitToUser(notification.recipient.toString(), "notification:new", notification);
    return notification;
};

const getMyNotifications = (userId, limit = 30) => Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 30, 1), 100));

const markRead = async (id, userId) => {
    const notification = await Notification.findOneAndUpdate({ _id: id, recipient: userId }, { readAt: new Date() }, { new: true });
    if (!notification) throw new Error("Notification not found.");
    return notification;
};

const markAllRead = (userId) => Notification.updateMany({ recipient: userId, readAt: null }, { readAt: new Date() });

module.exports = { createNotification, getMyNotifications, markRead, markAllRead };
