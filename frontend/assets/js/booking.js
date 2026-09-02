(() => {
    const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
    const token = localStorage.getItem("authToken");
    let user = null;
    try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { /* handled below */ }
    if (!token || !user) { location.replace("login.html"); return; }

    const $ = (selector) => document.querySelector(selector);
    const groundSelect = $("#ground"), dateInput = $("#date"), slotBoard = $("#slot-board");
    const reserve = $("#reserve"), method = $("#method"), content = $("#content");
    const summary = $("#selected-summary");
    let selectedSlot = null;

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
    const request = async (path, options = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response;
        try {
            response = await fetch(API_ROOT + path, {
                ...options,
                signal: controller.signal,
                headers: { Authorization: "Bearer " + token, ...(options.headers || {}) },
            });
        } catch (error) {
            if (error.name === "AbortError") throw new Error("The server did not respond. Start the backend server and try again.");
            throw new Error("Could not connect to the server. Start the backend server and try again.");
        } finally { clearTimeout(timeout); }
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "Something went wrong. Please try again.");
        return body.data;
    };
    // Browsing venues does not require a login token. Keeping this request
    // simple also avoids an unnecessary cross-origin preflight in Live Server.
    const publicRequest = async (path) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response;
        try { response = await fetch(API_ROOT + path, { signal: controller.signal }); }
        catch (error) {
            if (error.name === "AbortError") throw new Error("The server did not respond. Start the backend server and try again.");
            throw new Error("Could not connect to the server. Start the backend server and try again.");
        } finally { clearTimeout(timeout); }
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "Could not load playgrounds.");
        return body.data;
    };
    const showContent = (html) => { content.innerHTML = html; };
    const localDate = () => new Date().toLocaleDateString("en-CA");
    const bookingDate = (value) => new Date(value + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const money = (value) => value == null ? "Price set at checkout" : `৳${Number(value).toLocaleString()}`;

    function resetSelection() {
        selectedSlot = null;
        summary.hidden = true;
        summary.textContent = "";
        reserve.disabled = true;
    }

    const showNotice = (message, bad = false) => { const notice = $("#notice"); notice.textContent = message; notice.className = `notice${bad ? " error" : ""}`; notice.style.display = "block"; };
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

    function openGroundDetails(ground) {
        const existing = document.querySelector("#ground-details-modal");
        if (existing) existing.remove();
        const image = ground.coverImage || "assets/images/hero-bg.jpg";
        const facilities = Array.isArray(ground.facilities) && ground.facilities.length
            ? ground.facilities.map((facility) => `<span class="badge">${escapeHtml(facility)}</span>`).join(" ")
            : '<span class="meta">Facilities will be confirmed by the venue.</span>';
        const ownerId = String(ground.playgroundAdmin?._id || ground.playgroundAdmin?.id || ground.playgroundAdmin || "");
        const phone = String(ground.phone || ground.playgroundAdmin?.phone || "").replace(/[^+\d]/g, "");
        // Venue communication is intentionally available to customers only.
        // The chat page validates the logged-in user again before sending.
        const contactActions = user?.role === "customer" ? `<div class="venue-contact-actions">
            ${ownerId ? '<button class="alt chat-venue" type="button">Chat with venue</button>' : ""}
            ${phone ? '<a class="button alt call-venue" href="tel:' + escapeHtml(phone) + '">Call venue</a>' : ""}
        </div>` : "";
        const modal = document.createElement("div");
        modal.id = "ground-details-modal";
        modal.className = "modal show";
        modal.innerHTML = `<div class="modal-box ground-details"><button class="close" type="button" aria-label="Close details">×</button><img class="ground-detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(ground.name)}"><span class="badge">${escapeHtml(ground.sportType || "Sports")}</span><h2>${escapeHtml(ground.name)}</h2><p class="meta">${escapeHtml(ground.address || ground.area || "Location not provided")}</p><p class="ground-description">${escapeHtml(ground.description || "No additional venue description has been added yet.")}</p><div class="ground-info"><span><strong>Opening hours</strong>${escapeHtml(ground.openingTime || "—")} – ${escapeHtml(ground.closingTime || "—")}</span><span><strong>Players</strong>Up to ${escapeHtml(ground.maxPlayers || "—")} players</span><span><strong>Starting price</strong>৳${Number(ground.pricing?.morning || 0).toLocaleString()} / hour</span></div><h3>Facilities</h3><div class="facility-list">${facilities}</div>${contactActions}<button class="choose-from-details" type="button">Choose this playground</button></div>`;
        document.body.append(modal);
        const mapQuery = [ground.name, ground.address, ground.area, ground.district].filter(Boolean).join(", ");
        if (mapQuery) {
            const savedMapUrl = /^https?:\/\//i.test(String(ground.googleMapLocation || ""))
                ? ground.googleMapLocation
                : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery);
            const map = document.createElement("section");
            map.className = "venue-map-preview";
            map.innerHTML = '<div><strong>Live venue location</strong><a href="' + escapeHtml(savedMapUrl) + '" target="_blank" rel="noopener">Open in Google Maps ↗</a></div><iframe title="' + escapeHtml(ground.name) + ' location map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + encodeURIComponent(mapQuery) + '&output=embed"></iframe>';
            modal.querySelector(".facility-list").after(map);
        }
        const close = () => modal.remove();
        modal.querySelector(".close").addEventListener("click", close);
        modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
        modal.querySelector(".choose-from-details").addEventListener("click", () => {
            groundSelect.value = ground._id;
            close();
            document.querySelector("#booking-panel").scrollIntoView({ behavior: "smooth", block: "start" });
            loadAvailability();
        });
        modal.querySelector(".chat-venue")?.addEventListener("click", () => {
            location.href = "chat.html?contact=" + encodeURIComponent(ownerId);
        });
    }

    function renderSlots(slots) {
        if (!slots.length) {
            slotBoard.innerHTML = '<p class="meta">No published slots are available for this date.</p>';
            return;
        }
        slotBoard.innerHTML = slots.map((slot, index) => {
            const expired = slot.status === "Expired";
            const booked = slot.status === "Booked" || expired;
            return `<button type="button" class="slot-choice${booked ? " booked" : ""}${expired ? " expired" : ""}" data-slot="${index}" ${booked ? "disabled" : ""}><strong>${escapeHtml(slot.startTime)} – ${escapeHtml(slot.endTime)}</strong><small>${booked ? (expired ? "Slot time has passed" : "Customer Booked") : money(slot.price)}</small></button>`;
        }).join("");
        slotBoard.querySelectorAll("[data-slot]").forEach((button) => button.addEventListener("click", () => {
            selectedSlot = slots[Number(button.dataset.slot)];
            slotBoard.querySelectorAll(".slot-choice").forEach((item) => item.classList.toggle("selected", item === button));
            summary.hidden = false;
            summary.textContent = `${selectedSlot.startTime} – ${selectedSlot.endTime} on ${bookingDate(dateInput.value)}${selectedSlot.price != null ? ` · ${money(selectedSlot.price)}` : ""}`;
            reserve.disabled = !method.value;
        }));
    }

    async function loadAvailability() {
        resetSelection();
        if (!groundSelect.value || !dateInput.value) {
            slotBoard.innerHTML = '<p class="meta">Select a playground and date to view availability.</p>';
            return;
        }
        slotBoard.innerHTML = '<p class="meta">Loading available slots…</p>';
        try {
            const data = await request(`/slots/availability?playground=${encodeURIComponent(groundSelect.value)}&date=${encodeURIComponent(dateInput.value)}`);
            renderSlots(data.slots || []);
        } catch (error) {
            slotBoard.innerHTML = `<p class="meta">${escapeHtml(error.message)}</p>`;
        }
    }

    async function loadGrounds() {
        try {
            const data = await publicRequest("/playgrounds");
            const grounds = Array.isArray(data) ? data : [];
            groundSelect.innerHTML = '<option value="">Select playground</option>' + grounds.map((ground) => `<option value="${escapeHtml(ground._id)}">${escapeHtml(ground.name)}${ground.area || ground.address ? ` · ${escapeHtml(ground.area || ground.address)}` : ""}</option>`).join("");
            showContent(grounds.length ? grounds.map((ground, index) => `<article class="card"><img class="playground-cover" src="${escapeHtml(ground.coverImage || "assets/images/hero-bg.jpg")}" alt="${escapeHtml(ground.name)}"><span class="badge">${escapeHtml(ground.sportType || "Sports")}</span><h3>${escapeHtml(ground.name)}</h3><p>${escapeHtml(ground.address || ground.area || "Location available after booking")}<br>From ৳${Number(ground.pricing?.morning || 0).toLocaleString()} per hour</p><div class="card-foot"><button type="button" class="details-ground" data-ground-index="${index}">View details</button><button type="button" class="choose-ground" data-ground-id="${escapeHtml(ground._id)}">Choose</button></div></article>`).join("") : '<div class="empty">No active playground is available right now.</div>');
            content.querySelectorAll(".details-ground").forEach((button) => button.addEventListener("click", () => openGroundDetails(grounds[Number(button.dataset.groundIndex)])));
            content.querySelectorAll(".choose-ground").forEach((button) => button.addEventListener("click", () => {
                groundSelect.value = button.dataset.groundId;
                document.querySelector("#booking-panel").scrollIntoView({ behavior: "smooth", block: "start" });
                loadAvailability();
            }));
            const requested = new URLSearchParams(location.search).get("playground");
            if (requested && grounds.some((ground) => ground._id === requested)) { groundSelect.value = requested; loadAvailability(); }
        } catch (error) {
            showContent(`<div class="empty">${escapeHtml(error.message)}</div>`);
        }
    }

    async function loadBookings() {
        showContent('<div class="empty">Loading your bookings…</div>');
        try {
            const bookings = await request("/bookings/my-bookings");
            showContent(bookings.length ? bookings.map((booking) => `<article class="card"><span class="badge">${escapeHtml(booking.bookingStatus)} · ${escapeHtml(booking.paymentStatus)}</span><h3>${escapeHtml(booking.playground?.name || "Playground")}</h3><p>${bookingDate(String(booking.bookingDate).slice(0, 10))} · ${escapeHtml(booking.startTime)} – ${escapeHtml(booking.endTime)}<br>Total: ৳${Number(booking.totalAmount || 0).toLocaleString()}</p>${!["Cancelled", "Completed"].includes(booking.bookingStatus) ? `<div class="card-foot"><button class="alt cancel-booking" type="button" data-booking-id="${escapeHtml(booking._id)}">Cancel booking</button></div>` : ""}</article>`).join("") : '<div class="empty">You have no bookings yet.</div>');
            content.querySelectorAll(".card").forEach((card, index) => {
                const booking = bookings[index];
                if (!booking) return;
                const existingFooter = card.querySelector(".card-foot");
                const [hour, minute] = String(booking.startTime || "00:00").split(":").map(Number);
                const startAt = new Date(booking.bookingDate);
                startAt.setHours(hour, minute, 0, 0);
                const deadlinePassed = new Date() >= startAt;
                const message = booking.bookingStatus === "Cancelled" ? "Already cancelled" : booking.bookingStatus === "Completed" ? "Completed bookings cannot be cancelled" : deadlinePassed ? "The slot has already started, so it cannot be cancelled." : "";
                if (!message) return;
                if (existingFooter) existingFooter.innerHTML = `<span class="meta">${message}</span>`;
                else card.insertAdjacentHTML("beforeend", `<div class="card-foot"><span class="meta">${message}</span></div>`);
            });
            content.querySelectorAll(".cancel-booking").forEach((button) => button.addEventListener("click", () => {
                const booking = bookings.find((item) => String(item._id) === String(button.dataset.bookingId));
                if (!booking) return;
                openCancellationConfirmation({
                    title: "Cancel this slot booking?",
                    summary: `${booking.playground?.name || "Playground"} - ${bookingDate(String(booking.bookingDate).slice(0, 10))}, ${booking.startTime}-${booking.endTime}`,
                    policy: ["You can cancel anytime before the slot starts.", "A paid booking receives a full refund to the original payment method.", "The venue income report is adjusted immediately after the refund."],
                    onConfirm: async () => { const cancelled = await request(`/bookings/${button.dataset.bookingId}/cancel`, { method: "PATCH" }); showNotice(cancelled.refundAmount ? `Booking cancelled. BDT ${cancelled.refundAmount} refund completed.` : "Booking cancelled successfully."); await loadBookings(); loadAvailability(); },
                });
            }));
        } catch (error) { showContent(`<div class="empty">${escapeHtml(error.message)}</div>`); }
    }

    async function loadTickets() {
        showContent('<div class="empty">Loading your tickets…</div>');
        try {
            const payments = await request("/payments/my-payments");
            const paidTickets = payments.filter((payment) => payment.paymentStatus === "Paid");
            showContent(paidTickets.length ? paidTickets.map((payment) => {
                const booking = payment.booking;
                const team = payment.tournamentTeam;
                const qrPath = booking?.qrCode || team?.qrCode;
                const title = booking?.playground?.name || team?.tournament?.name || "TURF ticket";
                const subtitle = booking ? `${bookingDate(String(booking.bookingDate).slice(0, 10))} · ${booking.startTime} – ${booking.endTime}` : `Team: ${team?.teamName || "—"}`;
                const qrUrl = qrPath ? (String(qrPath).startsWith("data:") ? qrPath : `https://smart-playground-booking-tournament.onrender.com${qrPath}`) : "";
                return `<article class="card ticket"><div><span class="badge">PAID TICKET</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}<br>Paid: ৳${Number(payment.amount || 0).toLocaleString()}</p><div class="card-foot"><a class="button alt" href="receipt.html?payment=${encodeURIComponent(payment._id)}">View receipt</a>${qrUrl ? `<button class="download-ticket" type="button" data-qr-url="${escapeHtml(qrUrl)}" data-ticket-id="${escapeHtml(payment._id)}">Download QR</button>` : ""}</div></div>${qrUrl ? `<img src="${escapeHtml(qrUrl)}" alt="QR ticket for ${escapeHtml(title)}">` : ""}</article>`;
            }).join("") : '<div class="empty">No paid tickets yet. Complete a payment to receive a QR ticket.</div>');
            content.querySelectorAll(".download-ticket").forEach((button) => button.addEventListener("click", async () => {
                const original = button.textContent;
                button.disabled = true; button.textContent = "Downloading…";
                try {
                    const response = await fetch(button.dataset.qrUrl);
                    if (!response.ok) throw new Error("Ticket download failed.");
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(await response.blob());
                    link.download = `turf-ticket-${button.dataset.ticketId}.png`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                } catch (error) { alert(error.message); }
                finally { button.disabled = false; button.textContent = original; }
            }));
        } catch (error) { showContent(`<div class="empty">${escapeHtml(error.message)}</div>`); }
    }

    groundSelect.addEventListener("change", loadAvailability);
    dateInput.addEventListener("change", loadAvailability);
    method.addEventListener("change", () => { reserve.disabled = !(selectedSlot && method.value); });
    reserve.addEventListener("click", async () => {
        if (!selectedSlot || !method.value) return;
        reserve.disabled = true; reserve.textContent = "Creating booking…";
        try {
            const booking = await request("/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playground: groundSelect.value, bookingDate: dateInput.value, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime }) });
            const labels = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", card: "Card" };
            const checkout = await request("/payments/demo/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking: booking._id, paymentMethod: labels[method.value] }) });
            location.href = `demo-payment.html?payment=${encodeURIComponent(checkout.payment._id)}`;
        } catch (error) {
            alert(error.message);
            reserve.disabled = false;
            reserve.textContent = "Continue to payment";
            loadAvailability();
        }
    });
    $("#logout").addEventListener("click", () => { localStorage.removeItem("authToken"); localStorage.removeItem("authUser"); location.replace("login.html"); });
    dateInput.min = localDate(); dateInput.value = localDate();
    if (user.role !== "customer") {
        $("#booking-panel").innerHTML = '<h2>Booking is available to customer accounts</h2><p class="meta">Please sign in with a customer account to reserve a slot.</p>';
    }
    // The venue list is public.  Owners and admins cannot reserve a slot,
    // but they should still be able to browse every available playground.
    loadGrounds();
})();
