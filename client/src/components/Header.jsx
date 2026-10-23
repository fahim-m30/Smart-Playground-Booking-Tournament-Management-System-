import { useState } from "react";
import "./Header.css";

export default function Header({ page, user, navigate, logout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (target) => {
    setMenuOpen(false);
    navigate(target);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <header className="topbar site-header">
      <button className="brand site-brand" onClick={() => handleNav("home")}>
        <img className="brand-mark" src="/legacy/assets/images/favicon.png" alt="TURF" />
        <span>
          <b>TURF</b>
          <small>Smart Playground Booking & Tournament Management System</small>
        </span>
      </button>

      {/* Desktop Navigation */}
      <nav className="desktop-nav">
        <button className={page === "home" ? "active" : ""} onClick={() => handleNav("home")}>Home</button>
        <button className={page === "venues" ? "active" : ""} onClick={() => handleNav("venues")}>Playgrounds</button>
        <button className={page === "tournaments" ? "active" : ""} onClick={() => handleNav("tournaments")}>Tournament</button>
        <button className={page === "about" ? "active" : ""} onClick={() => handleNav("about")}>About</button>
        <button className={page === "contact" ? "active" : ""} onClick={() => handleNav("contact")}>Contact</button>
      </nav>

      {/* Desktop Actions */}
      <div className="nav-actions desktop-actions">
        {user ? (
          <>
            <button className="login-btn" onClick={() => handleNav("dashboard")}>Dashboard</button>
            <button className="register-btn" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <button className="login-btn" onClick={() => handleNav("auth")}>Login</button>
            <button className="register-btn" onClick={() => handleNav("auth")}>Register</button>
          </>
        )}
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className="mobile-hamburger"
        type="button"
        aria-label="Toggle mobile menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
        <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
        <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
      </button>

      {/* Mobile Navigation Drawer */}
      {menuOpen && (
        <div className="mobile-nav-drawer" onClick={() => setMenuOpen(false)}>
          <div className="mobile-nav-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-links">
              <button className={page === "home" ? "active" : ""} onClick={() => handleNav("home")}>Home</button>
              <button className={page === "venues" ? "active" : ""} onClick={() => handleNav("venues")}>Playgrounds</button>
              <button className={page === "tournaments" ? "active" : ""} onClick={() => handleNav("tournaments")}>Tournament</button>
              <button className={page === "about" ? "active" : ""} onClick={() => handleNav("about")}>About</button>
              <button className={page === "contact" ? "active" : ""} onClick={() => handleNav("contact")}>Contact</button>
            </div>
            <div className="mobile-nav-actions">
              {user ? (
                <>
                  <button className="login-btn" onClick={() => handleNav("dashboard")}>Dashboard ({user.name?.split(" ")[0]})</button>
                  <button className="register-btn" onClick={handleLogout}>Log out</button>
                </>
              ) : (
                <>
                  <button className="login-btn" onClick={() => handleNav("auth")}>Login</button>
                  <button className="register-btn" onClick={() => handleNav("auth")}>Register</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
