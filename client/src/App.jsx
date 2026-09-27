import { useEffect, useState } from "react";
import "./App.css";
import "./Legacy.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Playgrounds from "./pages/Playgrounds";
import VenueDetail from "./pages/VenueDetail";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import InfoPage from "./pages/InfoPage";
import { API, request } from "./services/api";

export default function App() {
  const [page, setPage] = useState("home");
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [query, setQuery] = useState(""); const [sport, setSport] = useState("");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("turf_user") || "null"));
  const [token, setToken] = useState(() => localStorage.getItem("turf_token") || "");
  const [notice, setNotice] = useState(null);
  const showNotice = (message, type = "success") => { setNotice({ message, type }); window.setTimeout(() => setNotice(null), 4500); };
  const navigate = (target) => { setPage(target); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const logout = () => { localStorage.removeItem("turf_token"); localStorage.removeItem("turf_user"); setToken(""); setUser(null); navigate("home"); showNotice("You have been signed out."); };
  const openVenue = async (venue) => { setSelectedVenue(venue); navigate("venue"); try { setSelectedVenue(await request(`/playgrounds/${venue._id}`)); } catch { /* The summary card remains usable. */ } };
  const login = (session) => { localStorage.setItem("turf_token", session.accessToken); localStorage.setItem("turf_user", JSON.stringify(session.user)); setToken(session.accessToken); setUser(session.user); showNotice(`Welcome back, ${session.user.name}!`); navigate("home"); };

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => { try { const params = new URLSearchParams({ limit: "24" }); if (query) params.set("search", query); if (sport) params.set("sportType", sport); const response = await fetch(`${API}/playgrounds?${params}`, { signal: controller.signal }); const data = await response.json(); if (data.success) setVenues(data.data || []); } catch (error) { if (error.name !== "AbortError") setVenues([]); } }, 220);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query, sport]);

  const isAuthPage = page === "auth";
  return <div className="app-shell">{!isAuthPage && <Header page={page} user={user} navigate={navigate} logout={logout}/>} {notice && <div className={`toast ${notice.type}`}>{notice.message}</div>}
    {page === "home" && <Home venues={venues.slice(0, 6)} query={query} setQuery={setQuery} sport={sport} setSport={setSport} openVenue={openVenue} navigate={navigate}/>} {page === "venues" && <Playgrounds venues={venues} query={query} setQuery={setQuery} sport={sport} setSport={setSport} openVenue={openVenue}/>} {page === "venue" && <VenueDetail venue={selectedVenue} token={token} user={user} openAuth={() => navigate("auth")} showNotice={showNotice}/>} {page === "auth" && <Auth onLogin={login} showNotice={showNotice} goHome={() => navigate("home")}/>} {page === "dashboard" && <Dashboard token={token} user={user} openAuth={() => navigate("auth")} showNotice={showNotice}/>} {page === "tournaments" && <Tournaments token={token} user={user} openAuth={() => navigate("auth")}/>} {page === "about" && <InfoPage title="Bangladesh's sports booking hub" eyebrow="ABOUT TURF" text="TURF connects players, venue owners and tournament organisers through one trusted booking platform." cards={[["Premium venues", "Find football, cricket and badminton venues with clear details."], ["Live availability", "Reserve published slots without calling or waiting."], ["Secure entry", "Keep every confirmation and QR ticket in one place."]]}/>} {page === "contact" && <InfoPage title="We are here to help." eyebrow="CONTACT TURF" text="Need support with a booking, venue listing or tournament? Our team is ready to help you get back in the game." cards={[["Booking support", "Get help with your upcoming game and payment."], ["Venue partners", "List and manage your playground on TURF."], ["Tournament desk", "Plan and promote your next competition."]]}/>} {!isAuthPage && <Footer navigate={navigate}/>}</div>;
}
