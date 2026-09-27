import { money } from "../services/api";

const fallbackImage = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80";

export default function VenueCard({ venue, openVenue }) {
  const image = venue.coverImage || venue.galleryImages?.[0] || fallbackImage;
  return <article className="venue-card"><img src={image} alt={venue.name} onError={(event) => { event.currentTarget.src = fallbackImage; }}/><div className="card-body"><div className="card-meta"><span>{venue.sportType || "Sports"}</span><span>★ {(venue.averageRating || 0).toFixed(1)}</span></div><h3>{venue.name}</h3><p className="muted">⌖ {venue.area || venue.address || "Bangladesh"}</p><div className="card-bottom"><strong>From {money(venue.pricing?.morning)}<small>/hr</small></strong><button className="round-button" aria-label={`View ${venue.name}`} onClick={() => openVenue(venue)}>→</button></div></div></article>;
}
