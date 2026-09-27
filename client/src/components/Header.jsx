export default function Header({ page, user, navigate, logout }) {
  return <header className="topbar">
    <button className="brand" onClick={() => navigate("home")}><span className="brand-mark">⚽</span><span><b>TURF</b><small>Smart Playground Booking & Tournament Management System</small></span></button>
    <nav>
      <button className={page === "home" ? "active" : ""} onClick={() => navigate("home")}>Home</button>
      <button className={page === "venues" ? "active" : ""} onClick={() => navigate("venues")}>Playgrounds</button>
      <button className={page === "tournaments" ? "active" : ""} onClick={() => navigate("tournaments")}>Tournament</button>
      <button className={page === "about" ? "active" : ""} onClick={() => navigate("about")}>About</button>
      <button className={page === "contact" ? "active" : ""} onClick={() => navigate("contact")}>Contact</button>
    </nav>
    <div className="nav-actions">{user ? <><button className="login-btn" onClick={() => navigate("dashboard")}>Dashboard</button><button className="register-btn" onClick={logout}>Log out</button></> : <><button className="login-btn" onClick={() => navigate("auth")}>Login</button><button className="register-btn" onClick={() => navigate("auth")}>Register</button></>}</div>
  </header>;
}
