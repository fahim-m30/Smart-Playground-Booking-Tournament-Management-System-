import { useEffect, useState } from "react";
import { money, prettyDate, request } from "../services/api";

export default function Tournaments({ token, user, openAuth }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!token) { setLoading(false); return; } request("/tournaments", { token }).then((data) => setItems(data || [])).catch(() => setItems([])).finally(() => setLoading(false)); }, [token]);
  return <main className="page section"><p className="eyebrow">COMPETE TOGETHER</p><h1 className="page-title">Upcoming tournaments.</h1>{!user ? <div className="empty"><strong>Sign in to explore tournaments.</strong><button className="primary" onClick={openAuth}>Sign in</button></div> : loading ? <p>Loading tournaments…</p> : <div className="tournament-grid">{items.length ? items.map((item) => <article className="tournament" key={item._id}><span>{item.sportType || "SPORTS"}</span><h2>{item.name}</h2><p>{prettyDate(item.startDate)} — {prettyDate(item.endDate)}</p><strong>{money(item.registrationFee)} entry</strong></article>) : <div className="empty"><strong>No tournaments are open right now.</strong><p>Check back shortly for the next fixture.</p></div>}</div>}</main>;
}
