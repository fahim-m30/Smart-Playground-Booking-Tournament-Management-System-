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
    <header className="site-header">
      <div
        className="site-brand"
        role="button"
        tabIndex={0}
        onClick={() => handleNav("home")}
        onKeyDown={(e) => e.key === "Enter" && handleNav("home")}
      >
        <img className="brand-mark" src="/legacy/assets/images/favicon.png" alt="TURF" />
        <div className="brand-text">
          <div className="brand-title-wrap">
            <b>TURF</b>
            <span className="brand-pill">SPORTS</span>
          </div>
          <small>Smart Playground Booking &amp; Tournament System</small>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav" aria-label="Main navigation">
        <button
          type="button"
          className={`nav-link ${page === "home" ? "active" : ""}`}
          onClick={() => handleNav("home")}
        >
          Home
        </button>
        <button
          type="button"
          className={`nav-link ${page === "venues" ? "active" : ""}`}
          onClick={() => handleNav("venues")}
        >
          Playgrounds
        </button>
        <button
          type="button"
          className={`nav-link ${page === "tournaments" ? "active" : ""}`}
          onClick={() => handleNav("tournaments")}
        >
          Tournament
        </button>
        <button
          type="button"
          className={`nav-link ${page === "about" ? "active" : ""}`}
          onClick={() => handleNav("about")}
        >
          About
        </button>
        <button
          type="button"
          className={`nav-link ${page === "contact" ? "active" : ""}`}
          onClick={() => handleNav("contact")}
        >
          Contact
        </button>
      </nav>

      {/* Desktop Actions */}
      <div className="nav-actions desktop-actions">
        {user ? (
          <>
            <button
              type="button"
              className="dashboard-nav-btn"
              onClick={() => handleNav("dashboard")}
            >
              <span className="user-pulse-dot" />
              <span>Dashboard ({user.name?.split(" ")[0] || "Account"})</span>
            </button>
            <button
              type="button"
              className="logout-nav-btn"
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="login-btn"
              onClick={() => handleNav("auth")}
            >
              Login
            </button>
            <button
              type="button"
              className="register-btn"
              onClick={() => handleNav("auth")}
            >
              Register
            </button>
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
              <button
                type="button"
                className={`mobile-nav-link ${page === "home" ? "active" : ""}`}
                onClick={() => handleNav("home")}
              >
                Home
              </button>
              <button
                type="button"
                className={`mobile-nav-link ${page === "venues" ? "active" : ""}`}
                onClick={() => handleNav("venues")}
              >
                Playgrounds
              </button>
              <button
                type="button"
                className={`mobile-nav-link ${page === "tournaments" ? "active" : ""}`}
                onClick={() => handleNav("tournaments")}
              >
                Tournament
              </button>
              <button
                type="button"
                className={`mobile-nav-link ${page === "about" ? "active" : ""}`}
                onClick={() => handleNav("about")}
              >
                About
              </button>
              <button
                type="button"
                className={`mobile-nav-link ${page === "contact" ? "active" : ""}`}
                onClick={() => handleNav("contact")}
              >
                Contact
              </button>
            </div>
            <div className="mobile-nav-actions">
              {user ? (
                <>
                  <button
                    type="button"
                    className="dashboard-nav-btn mobile-action-btn"
                    onClick={() => handleNav("dashboard")}
                  >
                    <span className="user-pulse-dot" />
                    <span>Dashboard ({user.name?.split(" ")[0] || "Account"})</span>
                  </button>
                  <button
                    type="button"
                    className="logout-nav-btn mobile-action-btn"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="login-btn mobile-action-btn"
                    onClick={() => handleNav("auth")}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="register-btn mobile-action-btn"
                    onClick={() => handleNav("auth")}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
