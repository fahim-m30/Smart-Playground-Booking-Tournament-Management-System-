import { useState } from "react";
import Search from "../components/Search";
import VenueCard from "../components/VenueCard";

export default function Playgrounds({ venues, query, setQuery, sport, setSport, openVenue, user, navigate }) {
  const [sortBy, setSortBy] = useState("featured");

  const sortedVenues = [...venues].sort((a, b) => {
    if (sortBy === "price-asc") {
      return (a.pricing?.morning || 0) - (b.pricing?.morning || 0);
    }
    if (sortBy === "price-desc") {
      return (b.pricing?.evening || 0) - (a.pricing?.evening || 0);
    }
    if (sortBy === "rating") {
      return (b.averageRating || 0) - (a.averageRating || 0);
    }
    return 0;
  });

  return (
    <main className="page section">
      {/* Top Back Navigation Bar */}
      {navigate && (
        <div className="page-back-toolbar">
          <button
            type="button"
            className="page-back-button"
            onClick={() => user ? navigate("dashboard") : navigate("home")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{user ? "Back to Dashboard" : "Back to Home"}</span>
          </button>
        </div>
      )}

      <div className="section-heading" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">VENUE DIRECTORY</p>
          <h1 className="page-title">Explore Playgrounds</h1>
          <p className="muted">Compare verified venues, review field facilities and book the perfect turf with confidence.</p>
        </div>
      </div>

      <Search {...{ query, setQuery, sport, setSport }} />

      {/* Filter and Sort Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", margin: "24px 0 18px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
        {/* Sport Pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", maxWidth: "100%", paddingBottom: "4px" }}>
          {[
            { id: "", label: "All Sports" },
            { id: "Football", label: "⚽ Football" },
            { id: "Cricket", label: "🏏 Cricket" },
            { id: "Badminton", label: "🏸 Badminton" }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`button alt ${sport === item.id ? "active" : ""}`}
              style={{
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: 600,
                minHeight: "36px",
                background: sport === item.id ? "#e8f7ec" : "#fff",
                borderColor: sport === item.id ? "#8cd6a0" : "#d1e7d7",
                color: sport === item.id ? "#0b602d" : "#334438"
              }}
              onClick={() => setSport(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sort Selector & Count */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
            {sortedVenues.length} venue{sortedVenues.length === 1 ? "" : "s"} found
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#fff", color: "#1e293b" }}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="venue-grid">
        {sortedVenues.length ? (
          sortedVenues.map((venue) => (
            <VenueCard key={venue._id} venue={venue} openVenue={openVenue} />
          ))
        ) : (
          <div className="empty" style={{ padding: "60px 20px" }}>
            <strong>No venues found.</strong>
            <p className="muted">Try adjusting your search query or sport filter.</p>
          </div>
        )}
      </div>
    </main>
  );
}
