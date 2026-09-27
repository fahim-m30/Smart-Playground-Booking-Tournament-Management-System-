import Search from "../components/Search";
import VenueCard from "../components/VenueCard";

export default function Playgrounds({ venues, query, setQuery, sport, setSport, openVenue }) {
  return <main className="page section"><p className="eyebrow">VENUE DIRECTORY</p><h1 className="page-title">Explore playgrounds</h1><p className="muted">Compare active venues, review facilities and choose the right slot with confidence.</p><Search {...{ query, setQuery, sport, setSport }} /><p className="result-count">{venues.length} venue{venues.length === 1 ? "" : "s"} available</p><div className="venue-grid">{venues.length ? venues.map((venue) => <VenueCard key={venue._id} venue={venue} openVenue={openVenue}/>) : <div className="empty"><strong>No venues found yet.</strong><p>Try a different sport or search term.</p></div>}</div></main>;
}
