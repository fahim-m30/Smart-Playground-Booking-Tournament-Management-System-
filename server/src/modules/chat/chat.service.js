const Chat = require("./chat.model");
const Booking = require("../booking/booking.model");
const Playground = require("../playground/playground.model");
const Slot = require("../slot/slot.model");
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
const realtimeChatMessage = (chat) => ({
    _id: String(chat._id),
    sender: chat.sender ? String(chat.sender) : null,
    recipient: chat.recipient ? String(chat.recipient) : null,
    message: chat.message,
    senderRole: chat.senderRole,
    createdAt: chat.createdAt,
});

// These rules keep communication useful for every account type without
// exposing a customer-to-customer direct-message channel.
const messageableRoles = {
    customer: ["playground-admin", "super-admin"],
    "playground-admin": ["customer", "super-admin"],
    "super-admin": ["customer", "playground-admin"],
};
const canMessageRole = (senderRole, recipientRole) =>
    Boolean(messageableRoles[senderRole]?.includes(recipientRole));

const conciergeFlow = (senderRole) => ["customer", "super-admin"].includes(senderRole);

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

const legacyConciergeResponseFor = (rawMessage, serviceName) => {
    const message = String(rawMessage || "").toLowerCase();
    const has = (...terms) => terms.some((term) => message.includes(term));
    const cancellation = has("cancel", "cencel", "cancellation", "refund", "বাতিল", " ফেরত");
    const tournament = has("tournament", "team registration", "tournament registration", "lottery", "draw", "fixture", "group stage");
    const slot = has("slot", "booking", "book", "reservation", "field", "মাঠ");

    if (cancellation && tournament) return "Tournament registration may be cancelled until 2 days before the tournament starts. Eligible paid registrations receive an automatic refund to the original payment method, followed by a confirmation notification.";
    if (cancellation && slot) return "A slot booking may be cancelled at least 2 hours before its start time. If eligible, the refund is processed automatically and a confirmation notification is issued.";
    if (has("lottery", "draw", "shuffle", "group stage")) return "Registered teams remain unassigned until the official live lottery. The playground administrator conducts the draw one day before play; each placement is revealed live, then the final fixture is published.";
    if (has("rain", "weather", "bristi", "বৃষ্টি", "unsafe", "power", "match cancel", "match cencel")) return "If a match cannot be played, the playground administrator records the official reason and announces the replay date and time. The next stage remains locked until the required match is completed.";
    if (has("fixture", "schedule", "semi", "final", "quarter", "knockout")) return "The final fixture is available after the official group draw. Knockout rounds follow the competition order: group stage, quarter-final where applicable, semi-final, then final; a later round cannot begin early.";
    if (has("payment", "pay", "bkash", "nagad", "rocket", "card", "charge")) return "For payment support, please share the booking or tournament name and payment method only. Never send card numbers, PINs, OTPs, or account credentials in chat.";
    if (has("available", "availability", "price", "cost", "fee", "rate", "time")) return `To check availability at ${serviceName}, please provide the sport, preferred date, start time, and duration. We will then confirm the suitable slot and price.`;
    if (has("hello", "hi", "assalam", "help", "support", "salam")) return "Welcome to TURF Support. I can help with slot availability, bookings, payments, cancellations, tournament registration, group draws, and fixtures. Please describe the issue briefly.";
    return null;
};

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD")}`;
const shortDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Date to be confirmed";
const botHas = (message, ...terms) => terms.some((term) => message.includes(term));
const handoffResponse = "Thanks for your message. A TURF representative will contact you shortly. Your request has been sent to the responsible support team for review.";

const venueInformation = (playground) => {
    if (!playground) return "Please select a playground or message its administrator so I can provide venue information.";
    const location = [playground.address, playground.area, playground.district].filter(Boolean).join(", ") || "Location not listed";
    const facilities = (playground.facilities || []).slice(0, 5).join(", ") || "Facilities are not listed yet";
    const hours = playground.openingTime && playground.closingTime ? `${playground.openingTime}–${playground.closingTime}` : "Hours to be confirmed";
    const mapHint = playground.googleMapLocation ? " Use the Open map button in this chat for live directions." : "";
    return `${playground.name} is a ${playground.sportType || "sports"} venue at ${location}. Hours: ${hours}. Capacity: up to ${playground.maxPlayers || "—"} players. Facilities: ${facilities}.${mapHint}`;
};

const slotInformation = async (playground) => {
    if (!playground) return "Please select a playground first so I can show its active slots and prices.";
    const slots = await Slot.find({ playground: playground._id, isActive: true, isDeleted: false })
        .select("startTime endTime durationMinutes price")
        .sort({ startTime: 1, endTime: 1 });
    const uniqueSlots = Array.from(new Map(slots.map((slot) => [`${slot.startTime}-${slot.endTime}-${slot.price}`, slot])).values()).slice(0, 5);
    if (!uniqueSlots.length) return `${playground.name} has no active slot schedule published yet. Please check with the venue administrator.`;
    const schedule = uniqueSlots.map((slot) => `${slot.startTime}–${slot.endTime} (${slot.durationMinutes || 60} min, ${money(slot.price)})`).join(" · ");
    return `${playground.name} active slot prices: ${schedule}. Availability changes by date, so share your preferred date to confirm an open slot.`;
};

const tournamentInformation = async (playground) => {
    if (!playground) return "Please select a playground first so I can show its tournament information.";
    const tournaments = await Tournament.find({ playground: playground._id, isDeleted: false, status: { $nin: ["Cancelled", "Completed"] } })
        .select("name sportType startDate registrationFee totalTeams status")
        .sort({ startDate: 1 })
        .limit(3);
    if (!tournaments.length) return `There is no active or upcoming tournament at ${playground.name} right now.`;
    const details = tournaments.map((tournament) => `${tournament.name} (${tournament.sportType}, ${shortDate(tournament.startDate)}, ${money(tournament.registrationFee)}, ${tournament.totalTeams} teams, ${tournament.status})`).join(" · ");
    return `Tournament information for ${playground.name}: ${details}. Open Tournament Centre for registration and official fixtures.`;
};

const conciergeResponseFor = async (rawMessage, playground) => {
    const message = String(rawMessage || "").toLowerCase();
    const cancellation = botHas(message, "cancel", "cencel", "cancellation", "refund", "বাতিল", "ফেরত");
    const tournament = botHas(message, "tournament", "team registration", "tournament registration", "lottery", "draw", "fixture", "group stage", "টুর্নামেন্ট", "ফিক্সচার");
    const slot = botHas(message, "slot", "booking", "book", "reservation", "availability", "price", "cost", "rate", "time", "স্লট", "বুকিং", "দাম");
    const venue = botHas(message, "venue", "playground", "location", "address", "facility", "facilities", "ground", "মাঠ", "ভেন্যু", "ঠিকানা", "সুবিধা");
    if (cancellation && tournament) return "Tournament registration may be cancelled until 2 days before the tournament starts. Eligible paid registrations receive an automatic refund to the original payment method, followed by a confirmation notification.";
    if (cancellation && slot) return "A slot booking may be cancelled at least 2 hours before its start time. If eligible, the refund is processed automatically and a confirmation notification is issued.";
    if (tournament) return tournamentInformation(playground);
    if (slot) return slotInformation(playground);
    if (venue) return venueInformation(playground);
    if (botHas(message, "payment", "pay", "bkash", "nagad", "rocket", "card", "charge")) return "For payment support, please share the booking or tournament name and payment method only. Never send card numbers, PINs, OTPs, or account credentials in chat.";
    if (botHas(message, "hello", "hi", "assalam", "help", "support", "salam", "হ্যালো", "হাই", "সাহায্য")) return "I can help with venue details, facilities, slot schedules and prices, bookings, tournaments, registration, group draws and fixtures. Tell me what you would like to know.";
    return handoffResponse;
};

const createProfessionalConciergeReply = async ({ senderId, senderRole, recipient, key, playground, customerMessage }) => {
    if (!conciergeFlow(senderRole)) return null;
    const response = await conciergeResponseFor(customerMessage, playground);
    const { start, end } = bangladeshDayBounds();
    const welcomedToday = await Chat.exists({
        conversationKey: key,
        senderRole: "system",
        isDeleted: false,
        createdAt: { $gte: start, $lt: end },
    });
    const serviceName = playground?.name || (recipient.role === "super-admin" ? "TURF Support" : "TURF Support Desk");
    const welcome = welcomedToday ? "" : `Welcome to ${serviceName}. I’m the TURF virtual assistant.`;
    const message = [welcome, response].filter(Boolean).join(" ");
    if (!message) return null;

    const botReply = await Chat.create({
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
    // This flag is only used while handling the current request. It is not
    // persisted on the chat record.
    botReply.needsHumanHandoff = response === handoffResponse;
    return botReply;
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
const playgroundSummary = (playground) => playground ? {
    id: playground._id,
    name: playground.name,
    sportType: playground.sportType,
    address: playground.address,
    googleMapLocation: playground.googleMapLocation,
} : null;

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
    const adminIds = users.filter((contact) => contact.role === "playground-admin").map((contact) => contact._id);
    const customerIds = users.filter((contact) => contact.role === "customer").map((contact) => contact._id);
    const [playgrounds, customerBookings] = await Promise.all([
        adminIds.length
            ? Playground.find({ playgroundAdmin: { $in: adminIds }, isDeleted: false })
                .select("playgroundAdmin name sportType address googleMapLocation")
                .sort({ createdAt: 1 })
            : [],
        customerIds.length
            ? Booking.find({ customer: { $in: customerIds }, isDeleted: false })
                .select("customer playground bookingDate createdAt")
                .populate("playground", "name sportType address googleMapLocation")
                .sort({ bookingDate: -1, createdAt: -1 })
            : [],
    ]);
    const playgroundByAdmin = new Map();
    playgrounds.forEach((playground) => {
        const adminId = idOf(playground.playgroundAdmin);
        if (!playgroundByAdmin.has(adminId)) playgroundByAdmin.set(adminId, playgroundSummary(playground));
    });
    const recentPlaygroundByCustomer = new Map();
    customerBookings.forEach((booking) => {
        const customerId = idOf(booking.customer);
        if (booking.playground && !recentPlaygroundByCustomer.has(customerId)) {
            recentPlaygroundByCustomer.set(customerId, playgroundSummary(booking.playground));
        }
    });
    return users.map((contact) => ({
        id: contact._id,
        name: contact.name,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
        playground: contact.role === "playground-admin"
            ? playgroundByAdmin.get(idOf(contact._id)) || null
            : recentPlaygroundByCustomer.get(idOf(contact._id)) || null,
        subtitle: contact.role.replace("-", " "),
    }));
};

const assertRecipientAllowed = async (senderId, senderRole, recipient) => {
    const adminId = recipient.role === "playground-admin"
        ? recipient._id
        : (senderRole === "playground-admin" ? senderId : null);
    if (adminId) {
        return Playground.findOne({ playgroundAdmin: adminId, isDeleted: false })
            .select("playgroundAdmin name sportType address area district openingTime closingTime maxPlayers facilities googleMapLocation")
            .sort({ createdAt: 1 });
    }

    const customerId = senderRole === "customer"
        ? senderId
        : (recipient.role === "customer" ? recipient._id : null);
    if (!customerId) return null;
    const booking = await Booking.findOne({ customer: customerId, isDeleted: false })
        .sort({ bookingDate: -1, createdAt: -1 })
        .populate("playground", "playgroundAdmin name sportType address area district openingTime closingTime maxPlayers facilities googleMapLocation");
    return booking?.playground || null;
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

    const botReply = await createProfessionalConciergeReply({
        senderId,
        senderRole,
        recipient,
        key: chat.conversationKey,
        playground,
        customerMessage: message,
    });

    await createNotification({
        recipient: recipient._id,
        type: "ChatMessage",
        title: `New message from ${sender.name}`,
        message,
        link: "chat.html",
    });

    // If the assistant cannot answer a customer or super-admin question, copy
    // the request and its handoff reply into the responsible venue admin's
    // conversation. This lets that admin read the complete support request.
    const handoffAdminId = idOf(playground?.playgroundAdmin);
    let handoffChat = null;
    let handoffBotReply = null;
    if (botReply?.needsHumanHandoff && handoffAdminId && handoffAdminId !== idOf(recipient)) {
        const handoffKey = conversationKey(senderId, handoffAdminId);
        handoffChat = await Chat.create({
            playground: playground._id,
            customer,
            admin: handoffAdminId,
            sender: senderId,
            recipient: handoffAdminId,
            participants: [senderId, handoffAdminId],
            conversationKey: handoffKey,
            message,
            senderRole,
        });
        handoffBotReply = await Chat.create({
            playground: playground._id,
            customer,
            admin: handoffAdminId,
            recipient: handoffAdminId,
            participants: [senderId, handoffAdminId],
            conversationKey: handoffKey,
            message: botReply.message,
            senderRole: "system",
            isRead: false,
        });
        await createNotification({
            recipient: handoffAdminId,
            type: "ChatHandoff",
            title: "New venue support request",
            message: `${sender.name} needs assistance at ${playground.name}: ${message.slice(0, 180)}`,
            link: "chat.html?contact=" + encodeURIComponent(String(senderId)),
        });
    }
    const chatEvent = { conversationKey: chat.conversationKey, message: realtimeChatMessage(chat) };
    emitToUser(recipient._id.toString(), "chat:message", chatEvent);
    // A sender can have the same account open in another tab; update it too.
    emitToUser(senderId.toString(), "chat:message", chatEvent);
    if (handoffChat) {
        emitToUser(handoffAdminId, "chat:message", { conversationKey: handoffChat.conversationKey, message: realtimeChatMessage(handoffChat) });
        emitToUser(handoffAdminId, "chat:message", { conversationKey: handoffChat.conversationKey, message: realtimeChatMessage(handoffBotReply) });
    }
    if (botReply) {
        const botEvent = {
            conversationKey: chat.conversationKey,
            message: realtimeChatMessage(botReply),
        };
        // Both people in this private support conversation see the assistant's
        // policy guidance instantly, so an admin can continue the same case.
        emitToUser(senderId.toString(), "chat:message", botEvent);
        emitToUser(recipient._id.toString(), "chat:message", botEvent);
    }
    return { chat, botReply };
};

const getConversations = async (userId, userRole) => {
    await migrateLegacyMessages(userId);
    const chats = await Chat.find({ participants: userId, isDeleted: false, sender: { $ne: null } })
        .populate("sender", "name role email phone")
        .populate("recipient", "name role email phone")
        .populate("playground", "name sportType address googleMapLocation")
        .sort({ createdAt: -1 });
    const conversations = new Map();
    for (const chat of chats) {
        const key = chat.conversationKey || conversationKey(chat.sender, chat.recipient);
        const contact = idOf(chat.sender) === String(userId) ? chat.recipient : chat.sender;
        if (!contact || !canMessageRole(userRole, contact.role)) continue;
        if (!conversations.has(key)) {
            conversations.set(key, {
                key,
                contact: { id: contact._id, name: contact.name, role: contact.role, email: contact.email, phone: contact.phone },
                playground: playgroundSummary(chat.playground),
                lastMessage: chat.message,
                lastMessageAt: chat.createdAt,
                unreadCount: 0,
            });
        } else if (!conversations.get(key).playground && chat.playground) {
            // Admin replies do not need to repeat the venue id; retain the
            // most recent venue already attached to this conversation.
            conversations.get(key).playground = playgroundSummary(chat.playground);
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
    const messages = await Chat.find({ conversationKey: key, participants: userId, isDeleted: false })
        .populate("sender", "name role")
        .populate("playground", "name sportType address googleMapLocation")
        .sort({ createdAt: 1 });
    await Chat.updateMany({ conversationKey: key, recipient: userId, isRead: false }, { isRead: true });
    const latestPlayground = [...messages].reverse().find((message) => message.playground)?.playground;
    return { contact: { ...contact.toObject(), playground: playgroundSummary(latestPlayground) }, messages };
};

module.exports = { sendMessage, getContacts, getConversations, getMessages, conciergeResponseFor };
