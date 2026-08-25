const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
let user;
try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { user = null; }

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value = "") => { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; };
const authFetch = (path, options = {}) => fetch(`${API_ROOT}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
const api = async (path) => { const response = await authFetch(path); const body = await response.json(); if (!response.ok) throw new Error(body.message || "Could not load data"); return body.data || []; };
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Date to be confirmed";
const statusClass = (status = "") => String(status).toLowerCase();
let realtimeRefreshTimer;
const refreshRealtime = () => {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => init(), 250);
};
if (typeof io !== "undefined" && token) {
    const socket = io("https://smart-playground-booking-tournament.onrender.com", { auth: { token } });
    socket.on("notification:new", () => { loadNotifications(); refreshRealtime(); });
    socket.on("booking:updated", refreshRealtime);
    socket.on("tournament:updated", refreshRealtime);
    socket.on("dashboard:update", refreshRealtime);
}
function renderAvatar() {
    const avatar = $("#user-avatar");
    const name = user?.name || "User";
    avatar.textContent = name.trim().charAt(0).toUpperCase();
    avatar.style.backgroundImage = "";
    if (user?.profileImage) {
        avatar.textContent = "";
        avatar.style.backgroundImage = 'url("' + String(user.profileImage).replace(/"/g, "%22") + '")';
    }
}

function nav(role) {
    const items = [
        { label: "Overview", icon: "O", href: "dashboard.html" },
        { label: "Messages", icon: "C", href: "chat.html" },
        { label: "Tournaments", icon: "T", href: "tournament.html" },
        { label: "Account centre", icon: "P", href: "management.html?tab=Profile" },
    ];
    if (role === "customer") items.splice(1, 0, { label: "Find playgrounds", icon: "F", href: "playgrounds.html" }, { label: "Book a slot", icon: "B", href: "booking.html" }, { label: "My bookings", icon: "M", href: "management.html?tab=Bookings" });
    if (role === "playground-admin") items.push(
        { label: "Venue management", icon: "G", href: "management.html?tab=Playgrounds" },
        { label: "Slots", icon: "S", href: "management.html?tab=Slots" },
        { label: "Bookings", icon: "B", href: "management.html?tab=Bookings" },
        { label: "Income", icon: "I", href: "management.html?tab=Income" }
    );
    items.push({ label: "Reports", icon: "R", href: "management.html?tab=Reports" });
    if (role === "super-admin") items.push({ label: "User control", icon: "U", href: "management.html?tab=Users" }, { label: "Playground control", icon: "G", href: "management.html?tab=Playgrounds" });
    $("#side-nav").innerHTML = items.map((item) => `<a class="${item.href === "dashboard.html" ? "active" : ""}" href="${item.href}">${item.icon} &nbsp;${item.label}</a>`).join("");
}

function bookingEndTime(booking) {
    const date = new Date(booking.bookingDate);
    const [hour, minute] = String(booking.endTime || "00:00").split(":").map(Number);
    date.setHours(hour, minute, 0, 0);
    return date;
}

function isUpcomingBooking(booking) { return !["Cancelled", "Completed"].includes(booking.bookingStatus) && bookingEndTime(booking) > new Date(); }
function isLiveTournament(tournament) {
    const end = new Date(tournament.endDate || tournament.startDate);
    end.setHours(23, 59, 59, 999);
    return !["Completed", "Cancelled"].includes(tournament.status) && end >= new Date();
}

function rows(items, render, empty = "Nothing to show yet.") { return items.length ? `<div class="list">${items.map(render).join("")}</div>` : `<p class="item-meta">${empty}</p>`; }
function bookingRow(booking) {
    const ground = booking.playground || {};
    return `<div class="list-row"><div><div class="item-title">${escapeHTML(ground.name || "Playground booking")}</div><p class="item-meta">${formatDate(booking.bookingDate)} · ${escapeHTML(booking.startTime)}–${escapeHTML(booking.endTime)}</p></div><span class="status ${statusClass(booking.bookingStatus)}">${escapeHTML(booking.bookingStatus || "Pending")}</span></div>`;
}
function bookingRow(booking) {
    const ground = booking.playground || {};
    const status = booking.paymentStatus === "Paid" ? "Confirmed" : (booking.bookingStatus || "Pending");
    return `<a class="list-row activity-link" href="my-bookings.html"><div><div class="item-title">${escapeHTML(ground.name || "Playground booking")}</div><p class="item-meta">${formatDate(booking.bookingDate)} · ${escapeHTML(booking.startTime)}–${escapeHTML(booking.endTime)}</p></div><span class="status ${statusClass(status)}">${escapeHTML(status)}</span></a>`;
}

function tournamentRow(tournament) {
    const ground = tournament.playgrounds?.[0] || tournament.playground || {};
    return `<div class="list-row"><div><div class="item-title">${escapeHTML(tournament.name)}</div><p class="item-meta">${escapeHTML(ground.name || "Venue TBD")} · ${formatDate(tournament.startDate)}</p></div><span class="status">${escapeHTML(tournament.status || "Upcoming")}</span></div>`;
}
function ticker(tournaments) {
    if (!tournaments.length) return `<div class="empty-state">No live or upcoming tournaments are available right now.</div>`;
    const cards = tournaments.map((tournament) => { const ground = tournament.playgrounds?.[0] || tournament.playground || {}; return `<div class="ticker-item"><strong>${escapeHTML(tournament.name)}</strong><small>• ${escapeHTML(ground.name || "Venue TBD")} · ${formatDate(tournament.startDate)}</small></div>`; }).join("");
    return `<div class="ticker"><span class="ticker-label">LIVE & UPCOMING</span><div class="ticker-track">${cards}${cards}</div></div>`;
}

function customerView(bookings, tournaments) {
    const active = bookings.filter(isUpcomingBooking);
    const live = tournaments.filter(isLiveTournament);
    return `<section class="stats"><article class="stat-card"><span>Active bookings</span><strong>${active.length}</strong></article><article class="stat-card"><span>Available tournaments</span><strong>${live.length}</strong></article><article class="stat-card"><span>Booking history</span><strong>${bookings.length}</strong></article></section><div class="section-heading"><div><h2>Pinned for you</h2><p>Your upcoming bookings stay at the top.</p></div><a class="text-link" href="booking.html">Manage bookings →</a></div><section class="pinned-grid">${active.length ? active.slice(0, 3).map((booking) => { const ground = booking.playground || {}; return `<article class="pin-card"><h3>${escapeHTML(ground.name || "Your playground booking")}</h3><p>${formatDate(booking.bookingDate)} · ${escapeHTML(booking.startTime)}–${escapeHTML(booking.endTime)}<br>${escapeHTML(ground.address || "Location details will be shared")}</p></article>`; }).join("") : `<div class="empty-state">No active booking yet. Book a slot and it will appear here.</div>`}</section><div class="section-heading"><div><h2>Explore tournaments</h2><p>Upcoming and currently running near you.</p></div><a class="text-link" href="tournament.html">View all →</a></div>${ticker(live)}<section class="split-grid"><article class="panel"><h2 class="panel-title">Upcoming bookings</h2>${rows(active.slice(0, 5), bookingRow, "You have not made an upcoming booking yet.")}</article><article class="panel"><h2 class="panel-title">Tournament updates</h2>${rows(live.slice(0, 4), tournamentRow)}</article></section>`;
}

function adminView(role, tournaments, playgrounds, slots, bookings) {
    const superAdmin = role === "super-admin";
    const live = tournaments.filter(isLiveTournament);
    const booked = bookings.filter(isUpcomingBooking);
    const slotCards = slots.length ? slots.map((slot) => `<article class="slot ${slot.isBooked ? "booked" : ""} ${slot.isActive ? "" : "inactive"}"><strong>${escapeHTML(slot.startTime)} – ${escapeHTML(slot.endTime)}</strong><span>${escapeHTML(slot.groundName || "Playground")} · ${slot.isBooked ? `Booked · ${formatDate(slot.bookingDate)}` : (slot.isActive ? "Available schedule" : "Inactive")}</span></article>`).join("") : `<div class="empty-state">Create slots for your playground to see them here.</div>`;
    return `<section class="stats"><article class="stat-card"><span>${superAdmin ? "Platform tournaments" : "Live tournaments"}</span><strong>${live.length}</strong></article><article class="stat-card"><span>${superAdmin ? "Listed playgrounds" : "My playgrounds"}</span><strong>${playgrounds.length}</strong></article><article class="stat-card"><span>${superAdmin ? "Scheduled activity" : "Booked slots"}</span><strong>${superAdmin ? live.length : booked.length}</strong></article></section><div class="section-heading"><div><h2>Live tournament feed</h2><p>Finished tournaments are automatically removed from this dashboard.</p></div><a class="text-link" href="tournament.html">Open tournaments →</a></div>${ticker(live)}${!superAdmin ? `<div class="section-heading"><div><h2>Slot availability</h2><p>Customer reservations are marked booked as soon as they are created.</p></div></div><section class="slot-board">${slotCards}</section>` : ""}<section class="split-grid"><article class="panel"><h2 class="panel-title">${superAdmin ? "Recent tournaments" : "Tournament activity"}</h2>${rows(live.slice(0, 5), tournamentRow)}</article><article class="panel"><h2 class="panel-title">${superAdmin ? "Venue overview" : "Upcoming booked slots"}</h2>${superAdmin ? rows(playgrounds.slice(0, 5), (ground) => `<div class="list-row"><div><div class="item-title">${escapeHTML(ground.name)}</div><p class="item-meta">${escapeHTML(ground.address || ground.area || "Location unavailable")}</p></div><span class="status">${escapeHTML(ground.status || "Active")}</span></div>`) : rows(booked.slice(0, 5), bookingRow, "No upcoming booking activity yet.")}</article></section>`;
}

function availabilityByPlayground(playgrounds, slots) {
    if (!playgrounds.length) return `<div class="empty-state">Add your first playground from Account centre to start setting availability.</div>`;
    return `<section class="availability-grid">${playgrounds.map((ground) => {
        const groundSlots = slots.filter((slot) => String(slot.playground?._id || slot.playground || "") === String(ground._id));
        const activeSlots = groundSlots.filter((slot) => slot.isActive);
        const times = activeSlots.length ? activeSlots.slice(0, 5).map((slot) => `<span>${escapeHTML(slot.startTime)}–${escapeHTML(slot.endTime)}</span>`).join("") : "<em>No active slots configured</em>";
        return `<article class="availability-card"><header><div><span class="venue-kicker">VENUE AVAILABILITY</span><h3>${escapeHTML(ground.name)}</h3><p>${escapeHTML(ground.address || ground.area || "Address pending")}</p></div><a href="management.html?tab=Slots">Manage</a></header><div class="availability-summary"><strong>${activeSlots.length}</strong><span>active weekly slots</span></div><div class="availability-times">${times}</div></article>`;
    }).join("")}</section>`;
}

function professionalAdminView(role, tournaments, playgrounds, slots, users = []) {
    const superAdmin = role === "super-admin";
    const live = tournaments.filter(isLiveTournament);
    const activeSlots = slots.filter((slot) => slot.isActive).length;
    const venueRows = rows(playgrounds.slice(0, 5), (ground) => `<div class="list-row"><div><div class="item-title">${escapeHTML(ground.name)}</div><p class="item-meta">${escapeHTML(ground.address || ground.area || "Location unavailable")}</p></div><span class="status">${escapeHTML(ground.status || "Active")}</span></div>`, "No venues have been added yet.");
    const stats = superAdmin ? `<section class="stats"><article class="stat-card"><span>Customers</span><strong>${users.filter((item) => item.role === "customer").length}</strong></article><article class="stat-card"><span>Playgrounds</span><strong>${playgrounds.length}</strong></article><article class="stat-card"><span>Playground admins</span><strong>${users.filter((item) => item.role === "playground-admin").length}</strong></article></section>` : `<section class="stats"><article class="stat-card"><span>Live tournaments</span><strong>${live.length}</strong></article><article class="stat-card"><span>My playgrounds</span><strong>${playgrounds.length}</strong></article><article class="stat-card"><span>Active slot schedules</span><strong>${activeSlots}</strong></article></section>`;
    return `${stats}<div class="section-heading"><div><h2>Live tournament feed</h2><p>Finished tournaments are automatically removed from this dashboard.</p></div><a class="text-link" href="tournament.html">Open tournaments →</a></div>${ticker(live)}${!superAdmin ? `<div class="section-heading"><div><h2>Availability by playground</h2><p>Each venue has a separate schedule for clearer operations.</p></div><a class="text-link" href="management.html?tab=Slots">Manage schedules →</a></div>${availabilityByPlayground(playgrounds, slots)}` : ""}<section class="split-grid"><article class="panel"><h2 class="panel-title">${superAdmin ? "Recent tournaments" : "Tournament activity"}</h2>${rows(live.slice(0, 5), tournamentRow)}</article><article class="panel"><h2 class="panel-title">${superAdmin ? "Venue overview" : "Venue status"}</h2>${venueRows}</article></section>`;
}

function incomeDashboard(income) {
    if (!income) return "";
    const money = (value) => `৳${new Intl.NumberFormat("en-BD").format(value || 0)}`;
    const slotRows = income.slots?.slice(0, 4).map((item) => `<div class="list-row"><div><div class="item-title">${escapeHTML(item.playground)}</div><p class="item-meta">${formatDate(item.date)} · ${escapeHTML(item.startTime)}–${escapeHTML(item.endTime)}</p></div><span class="status">${money(item.amount)}</span></div>`).join("") || '<p class="item-meta">No paid slot bookings yet.</p>';
    const tournamentRows = income.tournaments?.slice(0, 4).map((item) => `<div class="list-row"><div><div class="item-title">${escapeHTML(item.tournament)}</div><p class="item-meta">${escapeHTML(item.team)} · ${escapeHTML(item.playground)}</p></div><span class="status">${money(item.amount)}</span></div>`).join("") || '<p class="item-meta">No paid tournament registrations yet.</p>';
    const slotIcon = '<span class="income-icon slot-icon" aria-hidden="true">◷</span>';
    const tournamentIcon = '<span class="income-icon tournament-icon" aria-hidden="true">★</span>';
    return `<section class="income-dashboard"><div class="section-heading"><div><h2>Income overview</h2><p>Paid earnings from your own playgrounds.</p></div><a class="text-link" href="management.html?tab=Income">Full income report →</a></div><div class="income-stat-grid"><article>${slotIcon}<div><span>Slot income</span><strong>${money(income.slotTotal)}</strong></div></article><article>${tournamentIcon}<div><span>Tournament income</span><strong>${money(income.tournamentTotal)}</strong></div></article><article class="income-grand-total"><span>Total income</span><strong>${money(income.total)}</strong></article></div><section class="split-grid"><article class="panel income-panel slot-income-panel"><h2 class="panel-title">${slotIcon}<span>Slot booking income</span><small>Paid reservations</small></h2>${slotRows}</article><article class="panel income-panel tournament-income-panel"><h2 class="panel-title">${tournamentIcon}<span>Tournament income</span><small>Registration fees</small></h2>${tournamentRows}</article></section></section>`;
}

function matchResultCard(match) {
    const live = match.matchStatus === "Live";
    const completed = match.matchStatus === "Completed";
    const teamA = match.teamA?.teamName || "Team A";
    const teamB = match.teamB?.teamName || "Team B";
    const score = completed ? `${match.teamAScore} – ${match.teamBScore}` : "vs";
    return `<article class="match-result-card ${live ? "live" : ""}"><div class="match-result-meta"><span class="status ${live ? "live" : ""}">${live ? "LIVE" : "FULL TIME"}</span><span>${formatDate(match.matchDate)} · ${escapeHTML(match.startTime)}</span></div><div class="match-score"><strong>${escapeHTML(teamA)}</strong><b>${score}</b><strong>${escapeHTML(teamB)}</strong></div><p>${escapeHTML(match.playground?.name || "Tournament venue")} · ${escapeHTML(match.stage || "Match")}</p></article>`;
}

function mountMatchResults(matches) {
    const visible = matches.filter((match) => ["Live", "Completed"].includes(match.matchStatus)).sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate)).slice(0, 6);
    if (!visible.length) return;
    const section = document.createElement("section");
    section.className = "match-results-section";
    section.innerHTML = `<div class="section-heading"><div><h2>Live scores & recent results</h2><p>Results published by the playground administrator appear here automatically.</p></div><a class="text-link" href="tournament.html">Open fixtures →</a></div><div class="match-results-grid">${visible.map(matchResultCard).join("")}</div>`;
    $("#dashboard-body").append(section);
}

function enhanceActivityPanels() {
    document.querySelectorAll(".split-grid > .panel").forEach((panel) => {
        const title = panel.querySelector(".panel-title");
        if (!title || panel.dataset.enhanced) return;
        const text = title.textContent.trim().toLowerCase();
        const bookingPanel = text.includes("booking");
        const tournamentPanel = text.includes("tournament");
        if (!bookingPanel && !tournamentPanel) return;
        panel.dataset.enhanced = "true";
        panel.classList.add(bookingPanel ? "activity-bookings" : "activity-tournaments");
        const intro = document.createElement("p");
        intro.className = "activity-intro";
        intro.textContent = bookingPanel ? "Your next confirmed and pending playground slots." : "Competition status, fixtures and important updates.";
        title.after(intro);
        const empty = panel.querySelector(".item-meta");
        if (empty && !panel.querySelector(".list")) empty.classList.add("activity-empty");
    });
}

function renderAdminAddMenu() {
    return `<div class="admin-add-menu"><details><summary>+ Add</summary><div class="admin-add-options"><a href="playground-add.html">Add playground</a><a href="slot-add.html">Add slots</a></div></details></div>`;
}

const getTournamentMatches = async (tournaments) => (await Promise.all(
    tournaments.map((tournament) => api(`/tournaments/${tournament._id}/matches`).catch(() => []))
)).flat();

async function init() {
    if (!token || !user?.role) { location.replace("login.html"); return; }
    const role = String(user.role).toLowerCase();
    nav(role);
    // Venue setup is available only to playground administrators.
    // These actions were present in the page but remained permanently hidden.
    $("#quick-actions").hidden = role !== "playground-admin";
    $("#workspace-label").textContent = `${role.replace("-", " ")} workspace`;
    $("#role-label").textContent = role.replace("-", " ");
    $("#welcome-title").textContent = `Welcome back, ${user.name?.split(" ")[0] || "there"}`;
    $("#user-name").textContent = user.name || "User";
    $("#user-email").textContent = user.email || "";
    renderAvatar();
    try {
        const tournamentRequest = api("/tournaments");
        if (role === "customer") {
            const [bookings, tournaments] = await Promise.all([api("/bookings/my-bookings"), tournamentRequest]);
            $("#dashboard-body").innerHTML = customerView(bookings, tournaments);
            enhanceActivityPanels();
            mountMatchResults(await getTournamentMatches(tournaments));
            return;
        }
        const playgrounds = await api(role === "playground-admin" ? "/playgrounds/my-playgrounds" : "/playgrounds");
        const tournaments = await tournamentRequest;
        const users = role === "super-admin" ? await api("/users") : [];
        const matches = await getTournamentMatches(tournaments);
        let slots = [];
        if (role === "playground-admin") {
            const details = await Promise.all(playgrounds.map(async (ground) => {
                const groundSlots = await api(`/slots/playground/${ground._id}`).catch(() => []);
                return { slots: groundSlots.map((slot) => ({ ...slot, groundName: ground.name, playground: slot.playground || ground._id })) };
            }));
            slots = details.flatMap((detail) => detail.slots);
        }
        const income = role === "playground-admin" ? await api("/payments/playground-admin/income").catch(() => null) : null;
        $("#dashboard-body").innerHTML = incomeDashboard(income) + professionalAdminView(role, tournaments, playgrounds, slots, users);
        mountMatchResults(matches);
    } catch (error) {
        $("#dashboard-body").innerHTML = `<div class="empty-state">We could not load your dashboard data. Please refresh, or make sure the backend server is running.</div>`;
    }
}

$("#logout-button").addEventListener("click", () => { localStorage.removeItem("authToken"); localStorage.removeItem("authUser"); location.href = "login.html"; });
async function loadNotifications() {
    const list = $("#notification-list"), count = $("#notification-count");
    try {
        const notifications = await api("/notifications");
        const unread = notifications.filter((notification) => !notification.readAt).length;
        count.hidden = unread === 0; count.textContent = unread > 99 ? "99+" : unread;
        list.innerHTML = notifications.length ? notifications.map((notification) => {
            const created = new Date(notification.createdAt);
            const when = Number.isNaN(created.getTime()) ? "Just now" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(created);
            return `<a class="notification-item${notification.readAt ? "" : " unread"}" href="${escapeHTML(notification.link || "#")}" data-notification-id="${notification._id}"><strong>${escapeHTML(notification.title)}</strong><span>${escapeHTML(notification.message)}</span><time>${escapeHTML(when)}</time></a>`;
        }).join("") : '<p class="notification-empty">You are all caught up.</p>';
        list.querySelectorAll("[data-notification-id]").forEach((item) => item.addEventListener("click", () => authFetch(`/notifications/${item.dataset.notificationId}/read`, { method: "PATCH" })));
    } catch (_) { list.innerHTML = '<p class="notification-empty">Notifications could not be loaded.</p>'; }
}
$("#notification-button").addEventListener("click", () => {
    const menu = $("#notification-menu"), open = menu.hidden;
    menu.hidden = !open; $("#notification-button").setAttribute("aria-expanded", String(open));
    if (open) loadNotifications();
});
$("#mark-all-read").addEventListener("click", async () => { await authFetch("/notifications/read-all", { method: "PATCH" }); loadNotifications(); });
loadNotifications();
setInterval(loadNotifications, 60 * 1000);
$("#profile-image-upload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        alert("Choose an image file no larger than 5 MB.");
        event.target.value = "";
        return;
    }
    const data = new FormData();
    data.append("profileImage", file);
    try {
        const response = await authFetch("/users/me/profile-image", { method: "PUT", body: data });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Could not update profile image.");
        user = { ...user, ...body.data };
        localStorage.setItem("authUser", JSON.stringify(user));
        renderAvatar();
    } catch (error) {
        alert(error.message);
    } finally {
        event.target.value = "";
    }
});
$("#weather-date").innerHTML = `<span class="weather-icon">☀</span><div><strong>Today</strong><span>${new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span></div>`;
init();
// Rebuild the dashboard once every 24 hours so expired slots and completed
// tournaments leave the live workspace without manual refresh.
// Refresh frequently so results published by a playground admin appear in the
// dashboard without requiring customers to reload the page.
setInterval(init, 15 * 1000);

const weatherCodes = {
    0: ["☀️", "Clear sky"], 1: ["🌤️", "Mainly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"],
    45: ["🌫️", "Foggy"], 48: ["🌫️", "Foggy"], 51: ["🌦️", "Light drizzle"], 53: ["🌦️", "Drizzle"],
    55: ["🌧️", "Heavy drizzle"], 61: ["🌦️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
    80: ["🌦️", "Rain showers"], 81: ["🌧️", "Rain showers"], 82: ["⛈️", "Heavy showers"], 95: ["⛈️", "Thunderstorm"],
};
const dashboardDate = () => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
const showWeather = (icon, label) => {
    $("#weather-date").innerHTML = `<span class="weather-icon">${icon}</span><div><strong>${label}</strong><span>${dashboardDate()}</span></div>`;
};
async function loadWeather() {
    let latitude = 23.8103, longitude = 90.4125; // Dhaka fallback
    try {
        if (!navigator.geolocation) throw new Error("Geolocation unavailable");
        const position = await new Promise((resolve, reject) => navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 1800000 }));
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
    } catch (_) { /* location permission was not granted; use Dhaka */ }
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
        if (!response.ok) throw new Error("Weather service unavailable");
        const data = await response.json();
        const [icon, label] = weatherCodes[data.current?.weather_code] || ["🌡️", "Current weather"];
        showWeather(icon, `${Math.round(data.current.temperature_2m)}°C · ${label}`);
    } catch (_) {
        showWeather("☀️", "Weather unavailable");
    }
}
showWeather("☀️", "Loading weather");
loadWeather();
