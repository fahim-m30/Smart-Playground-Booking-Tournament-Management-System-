const Chat = require("./chat.model");
const Booking = require("../booking/booking.model");
const Playground = require("../playground/playground.model");
const Tournament = require("../tournament/tournament.model");
const TournamentTeam = require("../tournament/tournamentTeam.model");
const User = require("../user/user.model");
const { createNotification } = require("../notification/notification.service");
const { emitToUser } = require("../../config/socket");

const cleanMessage = (message) => {
    const value = String(message || "").trim();
    if (!value) throw new Error("Write a message before sending.");
    if (value.length > 1200) throw new Error("Messages cannot be longer than 1,200 characters.");
    return value;
};

const idOf = (value) => String(value?._id || value);
const conversationKey = (first, second) => [idOf(first), idOf(second)].sort().join(":");

// These rules keep communication useful for every account type without
// exposing a customer-to-customer direct-message channel.
const messageableRoles = {
    customer: ["playground-admin", "super-admin"],
    "playground-admin": ["customer", "super-admin"],
    "super-admin": ["customer", "playground-admin"],
};
const canMessageRole = (senderRole, recipientRole) =>
    Boolean(messageableRoles[senderRole]?.includes(recipientRole));

const conciergeFlow = canMessageRole;

// Use Bangladesh calendar days rather than a rolling 24-hour window.
const bangladeshDayBounds = (now = new Date()) => {
    const offset = 6 * 60 * 60 * 1000;
    const local = new Date(now.getTime() + offset);
    const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset);
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

const createConciergeReply = async ({ senderId, senderRole, recipient, key, playground }) => {
    if (!conciergeFlow(senderRole, recipient.role)) return null;
    const { start, end } = bangladeshDayBounds();
    const welcomeAlreadySentToday = await Chat.exists({
        conversationKey: key,
        senderRole: "system",
        isDeleted: false,
        createdAt: { $gte: start, $lt: end },
    });
    if (welcomeAlreadySentToday) return null;

    const isSystemSupport = senderRole === "super-admin" || recipient.role === "super-admin";
    const serviceName = isSystemSupport ? "TURF Support Desk" : (playground?.name || "the playground");
    const message = `Welcome to ${serviceName}. I’m the virtual assistant. How can we help you today?`;

    return Chat.create({
        playground: playground?._id || null,
        customer: senderRole === "customer" ? senderId : (recipient.role === "customer" ? recipient._id : null),
        admin: senderRole === "playground-admin" ? senderId : (recipient.role === "playground-admin" ? recipient._id : null),
        recipient: senderId,
        participants: [senderId, recipient._id],
        conversationKey: key,
        message,
        senderRole: "system",
        isRead: false,
    });
};

// Keep conversations created by the former playground-only chat readable.
const migrateLegacyMessages = async (userId) => {
    const legacy = await Chat.find({
        $or: [{ customer: userId }, { admin: userId }],
        sender: null,
        isDeleted: false,
    }).select("customer admin senderRole");

    await Promise.all(legacy.map((chat) => {
        if (!chat.customer || !chat.admin) return Promise.resolve();
        const customerSent = chat.senderRole === "customer";
        const sender = customerSent ? chat.customer : chat.admin;
        const recipient = customerSent ? chat.admin : chat.customer;
        return Chat.updateOne({ _id: chat._id }, {
            $set: {
                sender,
                recipient,
                participants: [chat.customer, chat.admin],
                conversationKey: conversationKey(chat.customer, chat.admin),
            },
        });
    }));
};

const ownPlaygroundIds = async (adminId) => (await Playground.find({
    playgroundAdmin: adminId,
    isDeleted: false,
}).select("_id")).map((playground) => playground._id);

const uniqueContacts = (contacts) => Array.from(new Map(contacts.map((contact) => [idOf(contact.id), contact])).values());

const getContacts = async (userId, userRole, search = "") => {
    const term = String(search).trim();
    const query = {
        _id: { $ne: userId },
        role: { $in: messageableRoles[userRole] || [] },
        isDeleted: false,
        isBlocked: false,
    };
    if (term) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.$or = [{ name: new RegExp(escaped, "i") }, { email: new RegExp(escaped, "i") }];
    }
    const users = await User.find(query).select("name role email phone").sort({ name: 1 }).limit(50);
    return users.map((contact) => ({
        id: contact._id,
        name: contact.name,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
        subtitle: contact.role.replace("-", " "),
    }));
};

const assertRecipientAllowed = async (senderId, senderRole, recipient) => {
    if (!conciergeFlow(senderRole, recipient.role)) return null;
    if (senderRole === "playground-admin") return null;
    const grounds = await Playground.find({ playgroundAdmin: recipient._id, isDeleted: false }).select("_id name").sort({ createdAt: 1 });
    return grounds[0] || null;
};

const sendMessage = async (payload, senderId, senderRole) => {
    const message = cleanMessage(payload.message);
    const recipient = await User.findOne({ _id: payload.recipient, isDeleted: false }).select("name role");
    if (!recipient) throw new Error("Choose a valid contact.");
    if (idOf(recipient) === String(senderId)) throw new Error("You cannot message yourself.");
    if (!canMessageRole(senderRole, recipient.role)) {
        throw new Error("This account cannot be contacted from your chat workspace.");
    }

    const playground = await assertRecipientAllowed(senderId, senderRole, recipient);
    const sender = await User.findOne({ _id: senderId, isDeleted: false }).select("name role");
    if (!sender) throw new Error("Your account is unavailable.");

    const customer = senderRole === "customer" ? senderId : (recipient.role === "customer" ? recipient._id : null);
    const admin = senderRole === "playground-admin" ? senderId : (recipient.role === "playground-admin" ? recipient._id : null);
    const chat = await Chat.create({
        playground: playground?._id || null,
        customer,
        admin,
        sender: senderId,
        recipient: recipient._id,
        participants: [senderId, recipient._id],
        conversationKey: conversationKey(senderId, recipient._id),
        message,
        senderRole,
    });

    const botReply = await createConciergeReply({
        senderId,
        senderRole,
        recipient,
        key: chat.conversationKey,
        playground,
    });

    await createNotification({
        recipient: recipient._id,
        type: "ChatMessage",
        title: `New message from ${sender.name}`,
        message,
        link: "chat.html",
    });
    emitToUser(recipient._id.toString(), "chat:message", { conversationKey: chat.conversationKey, senderId: senderId.toString() });
    // A sender can have the same account open in another tab; update it too.
    emitToUser(senderId.toString(), "chat:message", { conversationKey: chat.conversationKey, senderId: senderId.toString() });
    return { chat, botReply };
};

const getConversations = async (userId, userRole) => {
    await migrateLegacyMessages(userId);
    const chats = await Chat.find({ participants: userId, isDeleted: false, sender: { $ne: null } })
        .populate("sender", "name role email phone")
        .populate("recipient", "name role email phone")
        .sort({ createdAt: -1 });
    const conversations = new Map();
    for (const chat of chats) {
        const key = chat.conversationKey || conversationKey(chat.sender, chat.recipient);
        const contact = idOf(chat.sender) === String(userId) ? chat.recipient : chat.sender;
        if (!contact || !canMessageRole(userRole, contact.role)) continue;
        if (!conversations.has(key)) {
            conversations.set(key, { key, contact: { id: contact._id, name: contact.name, role: contact.role, email: contact.email, phone: contact.phone }, lastMessage: chat.message, lastMessageAt: chat.createdAt, unreadCount: 0 });
        }
        if (idOf(chat.recipient) === String(userId) && !chat.isRead) conversations.get(key).unreadCount += 1;
    }
    return [...conversations.values()];
};

const getMessages = async (userId, userRole, contactId) => {
    await migrateLegacyMessages(userId);
    const contact = await User.findOne({ _id: contactId, isDeleted: false }).select("name role email phone");
    if (!contact) throw new Error("Contact not found.");
    if (!canMessageRole(userRole, contact.role)) {
        throw new Error("This contact is not available in your chat workspace.");
    }
    const key = conversationKey(userId, contactId);
    const messages = await Chat.find({ conversationKey: key, participants: userId, isDeleted: false }).populate("sender", "name role").sort({ createdAt: 1 });
    await Chat.updateMany({ conversationKey: key, recipient: userId, isRead: false }, { isRead: true });
    return { contact, messages };
};

module.exports = { sendMessage, getContacts, getConversations, getMessages };
