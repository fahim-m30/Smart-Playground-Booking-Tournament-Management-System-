import { useEffect, useState } from "react";
import { isoDate, money, prettyDate, request, toMinutes } from "../services/api";

const fallbackImage = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80";

export default function VenueDetail({ venue, token, user, openAuth, navigate, showNotice }) {
  const [date, setDate] = useState(() => isoDate());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paying, setPaying] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("bKash");

  useEffect(() => {
    setSelectedSlot(null);
    if (!venue?._id) return;
    setLoading(true);
    request(`/slots/availability?playground=${venue._id}&date=${date}`)
      .then((data) => setSlots(data || []))
      .catch((error) => showNotice(error.message, "error"))
      .finally(() => setLoading(false));
  }, [venue?._id, date]);

  if (!venue) {
    return (
      <main className="page empty" style={{ padding: "80px 20px", textAlign: "center" }}>
        <strong>Select a venue to get started.</strong>
        {navigate && (
          <button className="button" style={{ marginTop: "14px" }} onClick={() => navigate("venues")}>
            Explore playgrounds
          </button>
        )}
      </main>
    );
  }

  const handleStartBooking = () => {
    if (!user || !token) return openAuth();
    if (user.role !== "customer") {
      return showNotice("Playground bookings can only be made from a customer account.", "error");
    }
    if (!selectedSlot) {
      return showNotice("Please choose an available slot first.", "error");
    }
    setCheckoutModal(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setPaying(true);
      const duration = (toMinutes(selectedSlot.endTime) - toMinutes(selectedSlot.startTime)) / 60;
      const booking = await request("/bookings", {
        method: "POST",
        token,
        body: {
          playground: venue._id,
          bookingDate: date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          duration
        }
      });

      await request("/payments", {
        method: "POST",
        token,
        body: {
          booking: booking._id,
          paymentMethod
        }
      });

      setSuccessBooking({ ...booking, playground: venue });
      setCheckoutModal(false);
      showNotice("Reservation confirmed! Your digital QR pass is ready.");
      setSelectedSlot(null);
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setPaying(false);
    }
  };

  const tomorrow = isoDate(new Date(Date.now() + 86400000));
  const dayAfter = isoDate(new Date(Date.now() + 86400000 * 2));

  return (
    <main className="venue-page">
      {/* Hero Banner */}
      <section
        className="venue-hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(8,20,18,0.88), rgba(8,20,18,0.3)), url(${venue.coverImage || fallbackImage})`
        }}
      >
        <div>
          <p className="eyebrow">{venue.sportType} ARENA</p>
          <h1>{venue.name}</h1>
          <p>⌖ {venue.address}, {venue.area || venue.division}</p>
        </div>
      </section>

      {/* Main Booking & Details Grid */}
      <section className="booking-layout">
        {/* Left Column: Venue Info & Amenities */}
        <div className="venue-info">
          <div className="rating">
            ★ {(venue.averageRating || 0).toFixed(1)} <span>({venue.totalReviews || 0} customer reviews)</span>
          </div>

          <h2>Built for your best game.</h2>
          <p>{venue.description || "A premier sports venue equipped with quality turf and player amenities."}</p>

          <h3 style={{ fontSize: "1.05rem", color: "#166534", marginTop: "20px" }}>Venue Amenities</h3>
          <div className="facility-list">
            {(venue.facilities?.length ? venue.facilities : ["Changing room", "Parking", "Floodlights", "Restrooms", "Water dispenser"]).map((item) => (
              <span key={item}>✓ {item}</span>
            ))}
          </div>

          {/* Pricing Matrix */}
          <div style={{ margin: "24px 0", padding: "16px", background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pricing Rates</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
              <div>
                <small style={{ color: "#64748b" }}>Morning</small>
                <div style={{ fontWeight: 700, color: "#0d5c29" }}>{money(venue.pricing?.morning || 1000)}/hr</div>
              </div>
              <div>
                <small style={{ color: "#64748b" }}>Day</small>
                <div style={{ fontWeight: 700, color: "#0d5c29" }}>{money(venue.pricing?.day || 1200)}/hr</div>
              </div>
              <div>
                <small style={{ color: "#64748b" }}>Evening</small>
                <div style={{ fontWeight: 700, color: "#0d5c29" }}>{money(venue.pricing?.evening || 1500)}/hr</div>
              </div>
              <div>
                <small style={{ color: "#64748b" }}>Weekend</small>
                <div style={{ fontWeight: 700, color: "#0d5c29" }}>{money(venue.pricing?.weekend || 1600)}/hr</div>
              </div>
            </div>
          </div>

          <div className="venue-contact">
            <span>Operating hours: <strong>{venue.openingTime} — {venue.closingTime}</strong></span>
            {venue.phone && <a href={`tel:${venue.phone}`}>Direct call: {venue.phone}</a>}
          </div>
        </div>

        {/* Right Column: Slot Selection & Checkout */}
        <aside className="booking-panel">
          <p className="eyebrow">RESERVE A SLOT</p>
          <h2>When do you want to play?</h2>

          {/* Date Picker & Quick Shortcuts */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`button alt ${date === isoDate() ? "active" : ""}`}
              style={{ padding: "6px 12px", fontSize: "0.78rem", minHeight: "34px", background: date === isoDate() ? "#e4f6e9" : "#fff" }}
              onClick={() => setDate(isoDate())}
            >
              Today
            </button>
            <button
              type="button"
              className={`button alt ${date === tomorrow ? "active" : ""}`}
              style={{ padding: "6px 12px", fontSize: "0.78rem", minHeight: "34px", background: date === tomorrow ? "#e4f6e9" : "#fff" }}
              onClick={() => setDate(tomorrow)}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className={`button alt ${date === dayAfter ? "active" : ""}`}
              style={{ padding: "6px 12px", fontSize: "0.78rem", minHeight: "34px", background: date === dayAfter ? "#e4f6e9" : "#fff" }}
              onClick={() => setDate(dayAfter)}
            >
              Day after
            </button>
          </div>

          <input
            aria-label="Booking date"
            type="date"
            min={isoDate()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

          <div className="slot-list">
            {loading ? (
              <p className="muted">Checking slot availability…</p>
            ) : slots.length ? (
              slots.map((slot) => (
                <button
                  disabled={!slot.available}
                  className={`slot ${selectedSlot?._id === slot._id ? "selected" : ""}`}
                  key={slot._id}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <span>{slot.startTime} — {slot.endTime}</span>
                  <strong>{slot.available ? money(slot.price || venue.pricing?.evening) : "Booked"}</strong>
                </button>
              ))
            ) : (
              <p className="muted">No published slots for this date.</p>
            )}
          </div>

          <button
            className="primary reserve"
            disabled={!selectedSlot}
            onClick={handleStartBooking}
          >
            {selectedSlot ? `Book for ${money(selectedSlot.price || venue.pricing?.evening)}` : "Select an available slot"}
          </button>
          <small>Instant digital QR entry pass generated upon payment.</small>
        </aside>
      </section>

      {/* CHECKOUT MODAL */}
      {checkoutModal && selectedSlot && (
        <div className="modal-overlay" onClick={() => setCheckoutModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span className="eyebrow">CONFIRM RESERVATION</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "1.35rem" }}>Checkout &amp; Pay</h2>
              </div>
              <button className="close" onClick={() => setCheckoutModal(false)}>✕</button>
            </header>

            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Venue</span>
                <strong>{venue.name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Date</span>
                <strong>{prettyDate(date)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Time Slot</span>
                <strong>{selectedSlot.startTime} – {selectedSlot.endTime}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: "8px", marginTop: "8px" }}>
                <span>Total Payable</span>
                <strong style={{ fontSize: "1.1rem", color: "#0f7636" }}>{money(selectedSlot.price || venue.pricing?.evening)}</strong>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleConfirmPayment(); }}>
              <label style={{ display: "block", marginBottom: "14px", fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                Select Payment Method
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: "100%", marginTop: "6px", padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                >
                  <option value="bKash">bKash Mobile Payment</option>
                  <option value="nagad">Nagad Instant Payment</option>
                  <option value="rocket">Dutch-Bangla Rocket</option>
                  <option value="card">Debit / Credit Card</option>
                </select>
              </label>

              <div className="card-foot" style={{ marginTop: "16px" }}>
                <button type="button" className="button alt" onClick={() => setCheckoutModal(false)}>Cancel</button>
                <button type="submit" className="button" disabled={paying}>
                  {paying ? "Processing payment…" : `Confirm & Pay ${money(selectedSlot.price || venue.pricing?.evening)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOKING SUCCESS MODAL */}
      {successBooking && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "500px", textAlign: "center", padding: "30px 24px" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#dcfce7", color: "#15803d", display: "grid", placeItems: "center", fontSize: "1.8rem", margin: "0 auto 16px" }}>
              ✓
            </div>
            <span className="eyebrow">RESERVATION CONFIRMED</span>
            <h2 style={{ margin: "6px 0 8px", fontSize: "1.45rem", color: "#163a23" }}>You're ready to play!</h2>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Your slot at <strong>{venue.name}</strong> on <strong>{prettyDate(date)} ({successBooking.startTime} – {successBooking.endTime})</strong> is locked.
            </p>

            <div style={{ padding: "14px", background: "#f0fbf3", border: "1px solid #b8e6c4", borderRadius: "12px", margin: "18px 0", fontSize: "0.82rem", color: "#0e5a28" }}>
              Show your digital QR pass at the venue check-in scanner.
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              {navigate && (
                <button
                  type="button"
                  className="button"
                  onClick={() => navigate("dashboard")}
                >
                  View QR Pass in Dashboard →
                </button>
              )}
              <button
                type="button"
                className="button alt"
                onClick={() => setSuccessBooking(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
