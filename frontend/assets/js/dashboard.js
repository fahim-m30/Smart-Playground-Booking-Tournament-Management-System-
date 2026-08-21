const API_ROOT = "http://localhost:5000/api/v1";
const token = localStorage.getItem("authToken");
let user;
try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { user = null; }

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value = "") => { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; };
const authFetch = (path, options = {}) => fetch(`${API_ROOT}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
const api = async (path) => { const response = await authFetch(path); const body = await response.json(); if (!response.ok) throw new Error(body.message || "Could not load data"); return body.data || []; };
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Date to be confirmed";
const statusClass = (status = "") => String(status).toLowerCase();
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
        { label: "Book a slot", icon: "B", href: "booking.html" },
        { label: "Messages", icon: "C", href: "chat.html" },
        { label: "Tournaments", icon: "T", href: "tournament.html" },
        { label: "Edit profile", icon: "P", href: "management.html?tab=Profile" },
        { label: "Reports", icon: "R", href: "management.html?tab=Reports" },
    ];
    if (role === "customer") items.splice(1, 0, { label: "My bookings", icon: "B", href: "booking.html" });
    if (role === "playground-admin") items.push({ label: "Playground operations", icon: "G", href: "management.html?tab=Playgrounds" });
    if (role === "super-admin") items.push({ label: "Admin control", icon: "A", href: "management.html?tab=Users" });
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

async function init() {
    if (!token || !user?.role) { location.replace("login.html"); return; }
    const role = String(user.role).toLowerCase();
    nav(role);
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
            return;
        }
        const playgrounds = await api(role === "playground-admin" ? "/playgrounds/my-playgrounds" : "/playgrounds");
        const tournaments = await tournamentRequest;
        let slots = [], bookings = [];
        if (role === "playground-admin") {
            const details = await Promise.all(playgrounds.map(async (ground) => {
                const [groundSlots, groundBookings] = await Promise.all([api(`/slots/playground/${ground._id}`).catch(() => []), api(`/bookings/playground/${ground._id}`).catch(() => [])]);
                return { slots: groundSlots.map((slot) => ({ ...slot, groundName: ground.name })), bookings: groundBookings };
            }));
            slots = details.flatMap((detail) => detail.slots);
            bookings = details.flatMap((detail) => detail.bookings);
        }
        $("#dashboard-body").innerHTML = adminView(role, tournaments, playgrounds, slots, bookings);
    } catch (error) {
        $("#dashboard-body").innerHTML = `<div class="empty-state">We could not load your dashboard data. Please refresh, or make sure the backend server is running.</div>`;
    }
}

$("#logout-button").addEventListener("click", () => { localStorage.removeItem("authToken"); localStorage.removeItem("authUser"); location.href = "login.html"; });
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
setInterval(init, 24 * 60 * 60 * 1000);

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
