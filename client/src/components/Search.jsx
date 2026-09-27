export default function Search({ query, setQuery, sport, setSport }) {
  return <div className="searchbox"><label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by venue or area" /></label><select value={sport} onChange={(event) => setSport(event.target.value)}><option value="">All sports</option><option>Football</option><option>Cricket</option><option>Badminton</option></select></div>;
}
