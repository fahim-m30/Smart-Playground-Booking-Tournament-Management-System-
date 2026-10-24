import "./Footer.css";

export default function Footer({ navigate }) {
  return (
    <footer className="turf-footer">
      <div className="turf-footer__glow" />

      <div className="turf-footer__container">
        {/* Brand & Mission Column */}
        <div className="turf-footer__brand-col">
          <div
            className="turf-footer__brand"
            role="button"
            tabIndex={0}
            onClick={() => navigate("home")}
            onKeyDown={(e) => e.key === "Enter" && navigate("home")}
          >
            <div className="turf-footer__logo-wrap">
              <img className="turf-footer__logo" src="/legacy/assets/images/favicon.png" alt="TURF" />
            </div>
            <div className="turf-footer__brand-copy">
              <div className="turf-footer__brand-title">
                <span>TURF</span>
                <span className="turf-footer__tag">SPORTS HUB</span>
              </div>
              <small>Booking &amp; Tournament Platform</small>
            </div>
          </div>

          <p className="turf-footer__desc">
            Dhaka&apos;s leading digital sports network. Reserve authentic artificial turf slots, register for competitive leagues, and verify entry passes with real-time QR security.
          </p>

          <div className="turf-footer__status-badge">
            <span className="pulse-dot" />
            <span>Dhaka Operational Hub · 24/7 Gate Validation</span>
          </div>
        </div>

        {/* Links Navigation Grid */}
        <div className="turf-footer__links-grid">
          {/* Col 1: Explore */}
          <div className="turf-footer__col">
            <h4 className="turf-footer__col-heading">Explore</h4>
            <ul className="turf-footer__list">
              <li>
                <button type="button" onClick={() => navigate("home")}>
                  Home Arena
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("venues")}>
                  Find Playgrounds
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("tournaments")}>
                  Live Tournaments
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("dashboard")}>
                  Player Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Platform & Features */}
          <div className="turf-footer__col">
            <h4 className="turf-footer__col-heading">Platform</h4>
            <ul className="turf-footer__list">
              <li>
                <button type="button" onClick={() => navigate("venues")}>
                  Slot Scheduling
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("dashboard")}>
                  QR Pass Gatekeeper
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("about")}>
                  About Platform
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("contact")}>
                  Help &amp; Support
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Sports Covered */}
          <div className="turf-footer__col">
            <h4 className="turf-footer__col-heading">Sports Covered</h4>
            <ul className="turf-footer__list turf-footer__sports">
              <li><span>⚽</span> 7-a-side Football</li>
              <li><span>🏏</span> Box Cricket Pitch</li>
              <li><span>🏸</span> Indoor Badminton</li>
              <li><span>🥅</span> Futsal &amp; Mini Turf</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Security Note */}
      <div className="turf-footer__bottom">
        <div className="turf-footer__bottom-container">
          <p className="turf-footer__copy">
            &copy; {new Date().getFullYear()} <strong>TURF System</strong>. All rights reserved. Crafted for Dhaka sports communities.
          </p>
          <div className="turf-footer__badges">
            <span className="security-pill">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              SSL Secured
            </span>
            <span className="pay-methods">bKash · Nagad · Cards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
