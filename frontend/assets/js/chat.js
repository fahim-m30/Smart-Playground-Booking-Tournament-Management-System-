const SERVER_URL = window.TURF_SERVER_URL || "https://smart-playground-booking-tournament.onrender.com";
const API = SERVER_URL + "/api/v1";
const token = localStorage.getItem("authToken");
let user;
try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { user = null; }

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
const idOf = (value) => String(value?._id || value?.id || value || "");
const initial = (value) => String(value || "T").trim().charAt(0).toUpperCase();
const displayRole = (value) => String(value || "contact").replace("-", " ");
const time = (value) => value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "";
const visibleContactRoles = {
    customer: ["playground-admin", "super-admin"],
    "playground-admin": ["customer", "super-admin"],
    "super-admin": ["customer", "playground-admin"],
};
const request = async (path, options = {}) => {
    const response = await fetch(API + path, { ...options, headers: { Authorization: "Bearer " + token, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Request failed");
    return body.data;
};

if (!token || !user?.role) location.replace("login.html");

let contacts = [];
let conversations = [];
let activeContact = null;
let searchTerm = "";
let searchTimer;
let activeRequest;
let refreshTimer;
let activeMessages = [];
let realtimeSocket;

const contactOf = (item) => item?.contact || item;
const contactIdOf = (item) => idOf(contactOf(item)?.id);
const recordFor = (contact, extra = {}) => ({ ...extra, contact: { ...contact, id: idOf(contact?.id) } });
const chatKeyFor = (first, second) => [idOf(first), idOf(second)].sort().join(":");
const canDisplayContact = (contact) => visibleContactRoles[user?.role]?.includes(contact?.role);

function availableRecords() {
    const permittedConversations = conversations.filter((item) => canDisplayContact(contactOf(item)));
    const conversationContactIds = new Set(permittedConversations.map(contactIdOf));
    const newContacts = contacts
        .filter((contact) => canDisplayContact(contact) && !conversationContactIds.has(idOf(contact.id)))
        .map((contact) => recordFor(contact, { isNew: true }));
    return [...permittedConversations, ...newContacts];
}

function matchesSearch(item) {
    if (!searchTerm) return true;
    const contact = contactOf(item);
    const haystack = [contact.name, contact.email, contact.subtitle, contact.playground?.name, contact.role, item.lastMessage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return haystack.includes(searchTerm);
}

function renderConversations() {
    const list = $("#conversation-list");
    const items = availableRecords().filter(matchesSearch);
    $("#conversation-title").textContent = "Messages";
    $("#conversation-caption").textContent = searchTerm
        ? items.length + " matching contact" + (items.length === 1 ? "" : "s")
        : "Choose a conversation or search to start a new one.";
    $("#clear-search").hidden = !searchTerm;

    if (!items.length) {
        list.innerHTML = '<p class="empty">' + (searchTerm ? "No contacts match your search." : "No contacts are available yet.") + "</p>";
        return;
    }

    list.innerHTML = items.map((item) => {
        const contact = contactOf(item);
        const contactId = contactIdOf(item);
        const selected = idOf(activeContact?.id) === contactId;
        const preview = item.lastMessage || contact.subtitle || ("New " + displayRole(contact.role) + " chat");
        const meta = item.lastMessageAt ? time(item.lastMessageAt) : "New";
        const unread = item.unreadCount ? '<b class="unread">' + item.unreadCount + "</b>" : "";
        // The API already limits the contact list by role, so every displayed
        // contact is a valid business contact for the current account.
        const canCall = Boolean(contact.phone);
        const call = canCall ? '<a class="conversation-call" href="tel:' + escapeHTML(String(contact.phone).replace(/[^+\d]/g, "")) + '" title="Call ' + escapeHTML(contact.name) + '" aria-label="Call ' + escapeHTML(contact.name) + '">☎</a>' : "";
        return '<div class="conversation-row"><button class="conversation ' + (selected ? "active" : "") + '" type="button" data-contact-id="' + escapeHTML(contactId) + '">'
            + '<span class="conversation-avatar">' + escapeHTML(initial(contact.name)) + "</span>"
            + '<span class="conversation-copy"><strong>' + escapeHTML(contact.name) + "</strong><span>" + escapeHTML(preview) + "</span></span>"
            + '<span class="conversation-meta">' + escapeHTML(meta) + unread + "</span></button>" + call + "</div>";
    }).join("");
    list.querySelectorAll("[data-contact-id]").forEach((button) => {
        button.onclick = () => selectById(button.dataset.contactId);
    });
}

function renderThread(messages = activeMessages) {
    activeMessages = messages;
    const contact = activeContact;
    const title = contact?.name || "Select a conversation";
    const subtitle = contact
        ? displayRole(contact.role) + " · " + (contact.email || contact.subtitle || "Direct messages")
        : "Choose a contact from the list to start a chat.";
    $("#thread-header").innerHTML = '<div class="chat-avatar">' + escapeHTML(initial(title)) + '</div><div><strong>'
        + escapeHTML(title) + "</strong><span>" + escapeHTML(subtitle) + "</span></div>";
    $("#message-form").hidden = !contact;

    if (!contact) {
        activeMessages = [];
        $("#message-list").innerHTML = '<div class="thread-empty"><span>💬</span><h2>Find someone to message</h2><p>Use the search field or choose a conversation from the list.</p></div>';
        return;
    }
    $("#message-list").innerHTML = messages.length
        ? messages.map((message) => {
            const mine = idOf(message.sender) === idOf(user._id || user.id);
            const system = message.senderRole === "system";
            return '<article class="message ' + (system ? "system" : (mine ? "mine" : "theirs")) + '"><div class="bubble">' + escapeHTML(message.message)
                + '</div><small>' + (system ? "TURF Virtual Assistant · " : (mine ? "You · " : "")) + escapeHTML(time(message.createdAt)) + "</small></article>";
        }).join("")
        : '<div class="thread-empty"><span>💬</span><h2>Start the conversation</h2><p>Write a message to contact ' + escapeHTML(title) + " directly.</p></div>";
    const list = $("#message-list");
    list.scrollTop = list.scrollHeight;
}

async function selectById(contactId, { keepThreadVisible = false } = {}) {
    const item = availableRecords().find((record) => contactIdOf(record) === String(contactId));
    if (!item) return;
    const selectedId = contactIdOf(item);
    activeContact = { ...contactOf(item), id: selectedId };
    renderConversations();
    if (!keepThreadVisible) {
        activeMessages = [];
        renderThread();
    }
    // Abort only an older message request. This prevents a slow previous
    // conversation from replacing the currently selected one.
    activeRequest?.abort();
    activeRequest = new AbortController();
    try {
        const result = await request("/chat/contacts/" + encodeURIComponent(selectedId) + "/messages", { signal: activeRequest.signal });
        if (idOf(activeContact?.id) !== selectedId) return;
        activeContact = { ...activeContact, ...result.contact, id: selectedId };
        const conversation = conversations.find((record) => contactIdOf(record) === selectedId);
        if (conversation) conversation.unreadCount = 0;
        renderConversations();
        renderThread(result.messages || []);
    } catch (error) {
        if (error.name === "AbortError") return;
        if (idOf(activeContact?.id) === selectedId) renderThread([]);
        alert(error.message);
    }
}

async function load(refreshThread = false) {
    try {
        const result = await Promise.all([request("/chat/contacts"), request("/chat/conversations")]);
        contacts = result[0] || [];
        conversations = result[1] || [];
        renderConversations();

        const activeId = idOf(activeContact?.id);
        if (activeId && refreshThread && availableRecords().some((record) => contactIdOf(record) === activeId)) {
            await selectById(activeId, { keepThreadVisible: true });
            return;
        }

        const requestedContact = new URLSearchParams(location.search).get("contact");
        if (!activeId && requestedContact && availableRecords().some((record) => contactIdOf(record) === requestedContact)) {
            await selectById(requestedContact);
        }
    } catch (error) {
        $("#conversation-list").innerHTML = '<p class="empty">' + escapeHTML(error.message) + "</p>";
    }
}

// Socket events are the source of truth for live updates. Debouncing avoids
// duplicate fetches when a notification and a chat event arrive together.
function refreshFromRealtime({ refreshThread = true } = {}) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => load(refreshThread && Boolean(activeContact)), 150);
}

function connectRealtime() {
    if (typeof io === "undefined" || !token) return;
    realtimeSocket = io(SERVER_URL, {
        auth: { token },
        // Let Socket.IO negotiate the most reliable transport for the
        // visitor's network instead of forcing a WebSocket-only start.
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 10000,
    });
    realtimeSocket.on("connect", () => refreshFromRealtime({ refreshThread: Boolean(activeContact) }));
    realtimeSocket.on("chat:message", (payload) => {
        const message = payload?.message;
        const activeKey = activeContact ? chatKeyFor(user._id || user.id, activeContact.id) : "";
        if (message && payload.conversationKey === activeKey) {
            if (!activeMessages.some((item) => idOf(item._id) === idOf(message._id))) {
                activeMessages = [...activeMessages, message];
                renderThread(activeMessages);
            }
            refreshFromRealtime({ refreshThread: false });
            return;
        }
        refreshFromRealtime({ refreshThread: false });
    });
    realtimeSocket.on("notification:new", refreshFromRealtime);
    realtimeSocket.on("connect_error", () => {
        // Socket.IO will reconnect automatically; chat remains usable through REST.
    });
}

$("#conversation-search").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderConversations();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        try {
            contacts = await request("/chat/contacts?search=" + encodeURIComponent(searchTerm));
            renderConversations();
        } catch (error) {
            $("#conversation-list").innerHTML = '<p class="empty">' + escapeHTML(error.message) + "</p>";
        }
    }, 250);
});
$("#clear-search").onclick = () => {
    $("#conversation-search").value = "";
    searchTerm = "";
    load();
    $("#conversation-search").focus();
};

$("#message-form").onsubmit = async (event) => {
    event.preventDefault();
    const recipient = idOf(activeContact?.id);
    const input = $("#message-input");
    const message = input.value.trim();
    if (!recipient || !message) return;

    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
        const result = await request("/chat/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipient, message }),
        });
        input.value = "";
        const outgoing = result?.chat;
        if (outgoing && !activeMessages.some((item) => idOf(item._id) === idOf(outgoing._id))) {
            activeMessages = [...activeMessages, outgoing];
            renderThread(activeMessages);
        }
        const conversation = conversations.find((item) => contactIdOf(item) === recipient);
        if (conversation) {
            conversation.lastMessage = outgoing?.message || message;
            conversation.lastMessageAt = outgoing?.createdAt || new Date().toISOString();
            renderConversations();
        }
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        input.focus();
    }
};

$("#message-input").addEventListener("keydown", (event) => {
    // Keep Shift+Enter available for multi-line messages.
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    const form = $("#message-form");
    if (!form.hidden && !form.querySelector("button").disabled) form.requestSubmit();
});

$("#logout").onclick = () => {
    localStorage.clear();
    location.replace("login.html");
};
$("#chat-title").textContent = displayRole(user?.role) + " messages";
load();
connectRealtime();

// Socket events update instantly. This lightweight fallback keeps messages
// current if a phone network, proxy or sleeping server delays reconnection.
const syncChatInBackground = () => {
    if (!document.hidden) refreshFromRealtime({ refreshThread: Boolean(activeContact) });
};
window.setInterval(syncChatInBackground, 10000);
window.addEventListener("focus", syncChatInBackground);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncChatInBackground();
});
window.addEventListener("beforeunload", () => realtimeSocket?.disconnect());
