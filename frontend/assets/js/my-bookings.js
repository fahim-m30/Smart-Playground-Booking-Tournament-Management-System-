(() => {
    const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("authUser") || "null");
    if (!token || !user) { location.replace("login.html"); return; }
    const $ = (selector) => document.querySelector(selector);
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const request = async (path, options = {}) => {
        const response = await fetch(API_ROOT + path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "Something went wrong.");
        return body.data;
    };
    const date = (value) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
    const content = $("#content");
    async function bookings() {
        content.innerHTML = '<div class="empty">Loading your bookings...</div>';
        try {
            const list = await request("/bookings/my-bookings");
            content.innerHTML = list.length ? list.map((b) => `<article class="card"><span class="badge">${escapeHtml(b.bookingStatus)} · ${escapeHtml(b.paymentStatus)}</span><h3>${escapeHtml(b.playground?.name || "Playground")}</h3><p>${date(b.bookingDate)} · ${escapeHtml(b.startTime)} – ${escapeHtml(b.endTime)}<br>Total: ৳${Number(b.totalAmount || 0).toLocaleString()}</p>${!["Cancelled", "Completed"].includes(b.bookingStatus) ? `<div class="card-foot"><button class="alt cancel" data-id="${b._id}">Cancel booking</button></div>` : ""}</article>`).join("") : '<div class="empty">You have no bookings yet. <a href="booking.html">Book a slot</a></div>';
            content.querySelectorAll(".cancel").forEach((button) => button.addEventListener("click", async () => {
                if (!confirm("Cancel this booking? You can cancel only at least 2 hours before the slot.")) return;
                button.disabled = true;
                try { await request(`/bookings/${button.dataset.id}/cancel`, { method: "PATCH" }); bookings(); } catch (error) { alert(error.message); button.disabled = false; }
            }));
        } catch (error) { content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
    }
    async function tickets() {
        content.innerHTML = '<div class="empty">Loading your tickets...</div>';
        try {
            const payments = await request("/payments/my-payments");
            const tickets = payments.filter((p) => p.paymentStatus === "Paid");
            content.innerHTML = tickets.length ? tickets.map((p) => { const b = p.booking, team = p.tournamentTeam, qr = b?.qrCode || team?.qrCode; const title = b?.playground?.name || team?.tournament?.name || "TURF ticket"; return `<article class="card ticket"><div><span class="badge">PAID TICKET</span><h3>${escapeHtml(title)}</h3><p>${b ? `${date(b.bookingDate)} · ${escapeHtml(b.startTime)} – ${escapeHtml(b.endTime)}` : `Team: ${escapeHtml(team?.teamName)}`}<br>Paid: ৳${Number(p.amount || 0).toLocaleString()}</p><a class="button alt" href="receipt.html?payment=${encodeURIComponent(p._id)}">View receipt</a></div>${qr ? `<img src="https://smart-playground-booking-tournament.onrender.com${escapeHtml(qr)}" alt="QR ticket">` : ""}</article>`; }).join("") : '<div class="empty">No paid tickets yet.</div>';
        } catch (error) { content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
    }
    $("#logout").addEventListener("click", () => { localStorage.removeItem("authToken"); localStorage.removeItem("authUser"); location.replace("login.html"); });
    document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button)); button.dataset.view === "tickets" ? tickets() : bookings(); }));
    bookings();
})();
