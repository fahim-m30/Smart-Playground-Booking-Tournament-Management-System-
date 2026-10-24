import { useMemo, useState } from "react";
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

  // Dynamically compute ID/Role-wise navigation links
  const navLinks = useMemo(() => {
    if (!user) {
      return [
        { id: "home", label: "Home" },
        { id: "venues", label: "Playgrounds" },
        { id: "tournaments", label: "Tournament" },
        { id: "about", label: "About" },
        { id: "contact", label: "Contact" },
      ];
    }

    const role = user.role;
    if (role === "staff") {
      return [
        { id: "dashboard", label: "QR Gate Check-in" },
        { id: "venues", label: "Playgrounds" },
      ];
    }

    if (role === "playground-admin") {
      return [
        { id: "dashboard", label: "Dashboard Console" },
        { id: "venues", label: "Playgrounds" },
        { id: "tournaments", label: "Tournaments" },
      ];
    }

    if (role === "super-admin") {
      return [
        { id: "dashboard", label: "Platform Dashboard" },
        { id: "venues", label: "Playgrounds" },
        { id: "tournaments", label: "Tournaments" },
      ];
    }

    // Default: Customer / Player
    return [
      { id: "dashboard", label: "My Bookings & QR" },
      { id: "venues", label: "Playgrounds" },
      { id: "tournaments", label: "Tournaments" },
      { id: "home", label: "Home" },
    ];
  }, [user]);

  const roleLabel = {
    staff: "Staff Gate",
    "playground-admin": "Venue Admin",
    "super-admin": "Super Admin",
    customer: "Player"
  }[user?.role] || "Member";

  return (
    <header className="site-header">
      <div
        className="site-brand"
        role="button"
        tabIndex={0}
        onClick={() => handleNav(user ? "dashboard" : "home")}
        onKeyDown={(e) => e.key === "Enter" && handleNav(user ? "dashboard" : "home")}
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

      {/* Desktop Navigation - Role & ID Adaptive */}
      <nav className="desktop-nav" aria-label="Main navigation">
        {navLinks.map((link) => (
          <button
            key={link.id}
            type="button"
            className={`nav-link ${page === link.id ? "active" : ""}`}
            onClick={() => handleNav(link.id)}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Desktop Actions */}
      <div className="nav-actions desktop-actions">
        {user ? (
          <div className="user-profile-nav">
            <button
              type="button"
              className="dashboard-nav-btn"
              onClick={() => handleNav("dashboard")}
              title={`Open ${user.role} workspace`}
            >
              <div className="user-avatar-badge">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="user-nav-meta">
                <span className="user-nav-name">{user.name?.split(" ")[0] || "Account"}</span>
                <span className={`user-role-chip role-${user.role || "customer"}`}>
                  {roleLabel}
                </span>
              </div>
            </button>
            <button
              type="button"
              className="logout-nav-btn"
              onClick={handleLogout}
              title="Sign out of account"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="21" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
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
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className={`mobile-nav-link ${page === link.id ? "active" : ""}`}
                  onClick={() => handleNav(link.id)}
                >
                  {link.label}
                </button>
              ))}
            </div>
            <div className="mobile-nav-actions">
              {user ? (
                <>
                  <button
                    type="button"
                    className="dashboard-nav-btn mobile-action-btn"
                    onClick={() => handleNav("dashboard")}
                  >
                    <div className="user-avatar-badge">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="user-nav-meta">
                      <span className="user-nav-name">{user.name || "Account"}</span>
                      <span className={`user-role-chip role-${user.role || "customer"}`}>
                        {roleLabel}
                      </span>
                    </div>
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
