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
    const showNotice = (message, bad = false) => {
        let notice = $("#notice");
        if (!notice) { notice = document.createElement("div"); notice.id = "notice"; notice.className = "notice"; document.querySelector(".tabs").before(notice); }
        notice.textContent = message;
        notice.className = `notice${bad ? " error" : ""}`;
        notice.style.display = "block";
    };
    const openCancellationConfirmation = ({ title, summary, policy, onConfirm }) => {
        const modal = document.createElement("div");
        modal.className = "modal show cancellation-confirmation";
        modal.innerHTML = `<section class="modal-box cancellation-box" role="dialog" aria-modal="true" aria-labelledby="cancellation-title"><button class="close" type="button" aria-label="Close">Close</button><span class="eyebrow">CANCELLATION REVIEW</span><h2 id="cancellation-title">${escapeHtml(title)}</h2><p class="meta">${escapeHtml(summary)}</p><section class="cancellation-policy"><strong>Before you cancel</strong><ul>${policy.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><p class="cancellation-question">Are you sure you want to cancel? This action cannot be undone.</p><div class="cancellation-actions"><button class="alt keep-booking" type="button">Keep booking</button><button class="confirm-cancellation" type="button">Yes, cancel & refund</button></div><p class="cancellation-error" hidden></p></section>`;
        const close = () => modal.remove();
        modal.querySelector(".close").onclick = close;
        modal.querySelector(".keep-booking").onclick = close;
        modal.onclick = (event) => { if (event.target === modal) close(); };
        modal.querySelector(".confirm-cancellation").onclick = async (event) => {
            const confirmButton = event.currentTarget;
            confirmButton.disabled = true;
            confirmButton.textContent = "Cancelling…";
            try { await onConfirm(); close(); }
            catch (error) { modal.querySelector(".cancellation-error").textContent = error.message; modal.querySelector(".cancellation-error").hidden = false; confirmButton.disabled = false; confirmButton.textContent = "Yes, cancel & refund"; }
        };
        document.body.append(modal);
    };
    async function bookings() {
        content.innerHTML = '<div class="empty">Loading your bookings...</div>';
        try {
            const [list, teams, payments] = await Promise.all([request("/bookings/my-bookings"), request("/tournaments/my-registrations"), request("/payments/my-payments")]);
            const pendingByBooking = new Map(payments.filter((payment) => payment.paymentStatus === "Pending" && payment.booking).map((payment) => [String(payment.booking?._id || payment.booking), payment]));
            const activeSlots = list.filter((booking) => !["Cancelled", "Completed"].includes(booking.bookingStatus) && new Date(`${String(booking.bookingDate).slice(0, 10)}T${booking.endTime}:00+06:00`) > new Date());
            const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
            const activeTeams = teams.filter((team) => team.paymentStatus === "Paid" && !["Cancelled", "Completed"].includes(team.tournament?.status) && String(team.tournament?.endDate || "").slice(0, 10) >= today);
            content.innerHTML = activeSlots.length ? activeSlots.map((booking) => {
                const pendingPayment = pendingByBooking.get(String(booking._id));
                const adminId = booking.playground?.playgroundAdmin?._id || booking.playground?.playgroundAdmin;
                const pay = pendingPayment ? `<a class="button" href="demo-payment.html?payment=${encodeURIComponent(pendingPayment._id)}">Complete payment</a>` : "";
                const chat = adminId ? `<a class="button alt" href="chat.html?contact=${encodeURIComponent(adminId)}">Chat with playground admin</a>` : "";
                const cancel = !["Cancelled", "Completed"].includes(booking.bookingStatus) ? `<button class="alt cancel" data-id="${booking._id}">Cancel booking</button>` : "";
                return `<article class="card"><span class="badge">${escapeHtml(booking.bookingStatus)} · ${escapeHtml(booking.paymentStatus)}</span><h3>${escapeHtml(booking.playground?.name || "Playground")}</h3><p>${date(booking.bookingDate)} · ${escapeHtml(booking.startTime)} – ${escapeHtml(booking.endTime)}<br>${escapeHtml(booking.playground?.address || "Location details unavailable")}<br>Total: ৳${Number(booking.totalAmount || 0).toLocaleString()}</p><div class="card-foot">${pay}${chat}${cancel}</div></article>`;
            }).join("") : "";
            if (activeTeams.length) content.insertAdjacentHTML("beforeend", activeTeams.map((team) => `<article class="card"><span class="badge">TOURNAMENT · PAID</span><h3>${escapeHtml(team.teamName)}</h3><p>${escapeHtml(team.tournament?.name || "Tournament")}<br>${date(team.tournament?.startDate)} – ${date(team.tournament?.endDate)}<br>Registration: ৳${Number(team.tournament?.registrationFee || 0).toLocaleString()}</p><div class="card-foot"><a class="button alt" href="tournament.html?fixture=${encodeURIComponent(team.tournament?._id)}">View fixture</a></div></article>`).join(""));
            if (activeSlots.length) {
                Array.from(content.querySelectorAll(".card")).slice(0, activeSlots.length).forEach((card, index) => {
                    const booking = activeSlots[index];
                    const startAt = new Date(`${String(booking.bookingDate).slice(0, 10)}T${booking.startTime}:00+06:00`);
                    if (startAt.getTime() - Date.now() < 2 * 60 * 60 * 1000) card.querySelector(".cancel")?.replaceWith(Object.assign(document.createElement("span"), { className: "meta", textContent: "Cancellation closes 2 hours before the slot." }));
                });
            }
            if (activeTeams.length) {
                const tournamentCards = Array.from(content.querySelectorAll(".card")).slice(activeSlots.length);
                tournamentCards.forEach((card, index) => {
                    const team = activeTeams[index];
                    const startAt = new Date(`${String(team.tournament?.startDate || "").slice(0, 10)}T00:00:00+06:00`);
                    const action = startAt.getTime() - Date.now() >= 48 * 60 * 60 * 1000
                        ? `<button class="alt cancel-tournament" data-team-id="${team._id}">Cancel registration</button>`
                        : '<span class="meta">Cancellation closes 2 days before the tournament.</span>';
                    card.querySelector(".card-foot")?.insertAdjacentHTML("beforeend", action);
                });
            }
            if (!activeSlots.length && !activeTeams.length) content.innerHTML = '<div class="empty">You have no active slot bookings or tournament registrations. <a href="booking.html">Book a slot</a> or <a href="tournament.html">join a tournament</a>.</div>';
            content.querySelectorAll(".ticket img").forEach((image) => {
                const prefix = "https://smart-playground-booking-tournament.onrender.comdata:";
                if (image.src.startsWith(prefix)) image.src = image.src.slice(prefix.length - "data:".length);
            });
            content.querySelectorAll(".cancel").forEach((button) => button.addEventListener("click", () => {
                const booking = list.find((item) => String(item._id) === String(button.dataset.id));
                if (!booking) return;
                openCancellationConfirmation({ title: "Cancel this slot booking?", summary: `${booking.playground?.name || "Playground"} - ${date(booking.bookingDate)}, ${booking.startTime}-${booking.endTime}`, policy: ["You can cancel only until 2 hours before the slot starts.", "Eligible paid bookings receive a full automatic refund to the original payment method.", "The venue income report is adjusted immediately after the refund."], onConfirm: async () => { const cancelled = await request(`/bookings/${button.dataset.id}/cancel`, { method: "PATCH" }); showNotice(cancelled.refundAmount ? `Booking cancelled. BDT ${cancelled.refundAmount} refund completed.` : "Booking cancelled successfully."); bookings(); } });
            }));
            content.querySelectorAll(".cancel-tournament").forEach((button) => button.addEventListener("click", () => {
                const team = teams.find((item) => String(item._id) === String(button.dataset.teamId));
                if (!team) return;
                openCancellationConfirmation({ title: "Cancel this tournament registration?", summary: `${team.teamName} - ${team.tournament?.name || "Tournament"}`, policy: ["You can cancel only until 2 days before the tournament starts.", "Eligible paid registrations receive a full automatic refund to the original payment method.", "The organiser income report is adjusted immediately after the refund."], onConfirm: async () => { const cancelled = await request(`/tournaments/teams/${button.dataset.teamId}/cancel`, { method: "PATCH" }); showNotice(cancelled?.refundAmount ? `Registration cancelled. BDT ${cancelled.refundAmount} refund completed.` : "Tournament registration cancelled."); bookings(); } });
            }));
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
