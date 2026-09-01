const API = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
const paymentId = new URLSearchParams(location.search).get("payment");
if (!token || !paymentId) location.replace("booking.html");
const escapeHTML = (value) => String(value ?? "—").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
const item = (label, value) => `<div><span>${label}</span><strong>${escapeHTML(value)}</strong></div>`;
(async () => {
  try {
    const response = await fetch(`${API}/payments/${paymentId}`, { headers:{ Authorization:`Bearer ${token}` } });
    const body = await response.json(); if (!response.ok) throw new Error(body.message || "Receipt not found");
    const payment = body.data, booking = payment.booking, team = payment.tournamentTeam, isBooking = Boolean(booking);
    document.querySelector("#type").textContent = isBooking ? "SLOT BOOKING" : "TOURNAMENT REGISTRATION";
    document.querySelector("#title").textContent = isBooking ? booking.playground?.name : team?.tournament?.name;
    if (!isBooking) document.querySelector("#group-assignment-notice").hidden = false;
    document.querySelector("#venue").textContent = isBooking ? booking.playground?.address : `Team: ${team?.teamName || "—"}`;
    const data = isBooking ? [item("Booking date", new Date(booking.bookingDate).toLocaleDateString("en-GB")), item("Time", `${booking.startTime} – ${booking.endTime}`), item("Duration", `${booking.duration} hour(s)`)] : [item("Team", team?.teamName), item("Contact", team?.contactNumber), item("Tournament", team?.tournament?.name)];
    data.push(item("Payment method", payment.paymentMethod), item("Paid at", new Date(payment.paidAt || payment.createdAt).toLocaleString("en-GB")));
    document.querySelector("#details").innerHTML = data.join(""); document.querySelector("#amount").textContent = `৳${payment.amount}`;
    document.querySelector("#reference").textContent = `Receipt no. ${payment.transactionId || payment._id}`;
    const qrPath = booking?.qrCode || team?.qrCode;
    if (qrPath) {
      const qr = document.querySelector("#qr");
      qr.src = String(qrPath).startsWith("data:") ? qrPath : `https://smart-playground-booking-tournament.onrender.com${qrPath}`;
      qr.hidden = false;
    }
  } catch (error) { document.querySelector("#title").textContent = error.message; }
})();
