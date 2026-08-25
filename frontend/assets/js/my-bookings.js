(() => {
    const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("authUser") || "null");
    if (!token || !user) { location.replace("login.html"); return; }
    const $ = (selector) => document.querySelector(selector);
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const request = async (path, options = {}) => { const response = await fetch(API_ROOT + path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || "Something went wrong."); return body.data; };
    const date = (value) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
    const content = $("#content");
    async function bookings() {
        content.innerHTML = '<div class="empty">Loading your bookings...</div>';
        try {
            const [list, payments] = await Promise.all([request("/bookings/my-bookings"), request("/payments/my-payments")]);
            const pendingByBooking = new Map(payments.filter((payment) => payment.paymentStatus === "Pending" && payment.booking).map((payment) => [String(payment.booking?._id || payment.booking), payment]));
            content.innerHTML = list.length ? list.map((booking) => {
                const pendingPayment = pendingByBooking.get(String(booking._id));
                const adminId = booking.playground?.playgroundAdmin?._id || booking.playground?.playgroundAdmin;
                const pay = pendingPayment ? `<a class="button" href="demo-payment.html?payment=${encodeURIComponent(pendingPayment._id)}">Complete payment</a>` : "";
                const chat = adminId ? `<a class="button alt" href="chat.html?contact=${encodeURIComponent(adminId)}">Chat with playground admin</a>` : "";
                const cancel = !["Cancelled", "Completed"].includes(booking.bookingStatus) ? `<button class="alt cancel" data-id="${booking._id}">Cancel booking</button>` : "";
                return `<article class="card"><span class="badge">${escapeHtml(booking.bookingStatus)} · ${escapeHtml(booking.paymentStatus)}</span><h3>${escapeHtml(booking.playground?.name || "Playground")}</h3><p>${date(booking.bookingDate)} · ${escapeHtml(booking.startTime)} – ${escapeHtml(booking.endTime)}<br>${escapeHtml(booking.playground?.address || "Location details unavailable")}<br>Total: ৳${Number(booking.totalAmount || 0).toLocaleString()}</p><div class="card-foot">${pay}${chat}${cancel}</div></article>`;
            }).join("") : '<div class="empty">You have no bookings yet. <a href="booking.html">Book a slot</a></div>';
            content.querySelectorAll(".cancel").forEach((button) => button.addEventListener("click", async () => { if (!confirm("Cancel this booking? You can cancel only at least 2 hours before the slot.")) return; button.disabled = true; try { await request(`/bookings/${button.dataset.id}/cancel`, { method: "PATCH" }); bookings(); } catch (error) { alert(error.message); button.disabled = false; } }));
        } catch (error) { content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
    }
    async function tickets() {
        content.innerHTML = '<div class="empty">Loading your tickets...</div>';
        try { const payments = await request("/payments/my-payments"); const tickets = payments.filter((payment) => payment.paymentStatus === "Paid"); content.innerHTML = tickets.length ? tickets.map((payment) => { const booking = payment.booking, team = payment.tournamentTeam, qr = booking?.qrCode || team?.qrCode, title = booking?.playground?.name || team?.tournament?.name || "TURF ticket"; return `<article class="card ticket"><div><span class="badge">PAID TICKET</span><h3>${escapeHtml(title)}</h3><p>${booking ? `${date(booking.bookingDate)} · ${escapeHtml(booking.startTime)} – ${escapeHtml(booking.endTime)}` : `Team: ${escapeHtml(team?.teamName)}`}<br>Paid: ৳${Number(payment.amount || 0).toLocaleString()}</p><a class="button alt" href="receipt.html?payment=${encodeURIComponent(payment._id)}">View receipt</a></div>${qr ? `<img src="https://smart-playground-booking-tournament.onrender.com${escapeHtml(qr)}" alt="QR ticket">` : ""}</article>`; }).join("") : '<div class="empty">No paid tickets yet.</div>'; } catch (error) { content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
    }
    $("#logout").addEventListener("click", () => { localStorage.removeItem("authToken"); localStorage.removeItem("authUser"); location.replace("login.html"); });
    document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button)); button.dataset.view === "tickets" ? tickets() : bookings(); }));
    bookings();
})();
