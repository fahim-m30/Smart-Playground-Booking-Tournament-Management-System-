import { useEffect, useState, useMemo, useRef } from "react";
import "./Dashboard.css";
import { API, money, prettyDate, isoDate, request } from "../services/api";

// ===================================================
// Authentic SVG Icons (from legacy dashboard.js)
// ===================================================
function NavIcon({ name }) {
  const icons = {
    overview: <svg viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" /></svg>,
    playgrounds: <svg viewBox="0 0 24 24"><path d="M4 19V8l8-5 8 5v11h-5v-5H9v5H4Zm3-8h2V9H7v2Zm0 3h2v-2H7v2Zm8-3h2V9h-2v2Zm0 3h2v-2h-2v2Z" /></svg>,
    booking: <svg viewBox="0 0 24 24"><path d="M7 2v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 8h3m-3 3h6" /></svg>,
    bookings: <svg viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 5h8M8 13h8m-8 4h5" /></svg>,
    messages: <svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 1-8 8 8.8 8.8 0 0 1-3.7-.8L4 20l1.4-3.6A8 8 0 1 1 20 11ZM8 11h.01M12 11h.01M16 11h.01" /></svg>,
    tournament: <svg viewBox="0 0 24 24"><path d="M8 3h8v4a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 0v5m-3 5h6m-8 0h10" /></svg>,
    account: <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" /></svg>,
    reports: <svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6" /></svg>,
    venue: <svg viewBox="0 0 24 24"><path d="M4 20V6l8-3 8 3v14M4 20h16M8 9h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" /></svg>,
    slots: <svg viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 5h8m-8 4h4m4 0h.01M8 17h4" /></svg>,
    income: <svg viewBox="0 0 24 24"><path d="M12 3v18m4-14.5c-.7-.8-1.9-1.3-3.5-1.3-2.3 0-3.8 1.1-3.8 2.8 0 1.7 1.4 2.4 3.8 3 2.4.6 3.8 1.4 3.8 3.2 0 1.8-1.5 3-4 3-1.8 0-3.2-.6-4.1-1.7" /></svg>,
    users: <svg viewBox="0 0 24 24"><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20m11-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm3 3.8a4 4 0 0 1 4 3.7V20" /></svg>
  };
  return <span className="nav-icon">{icons[name] || icons.overview}</span>;
}

// Sound effect for QR verification
function playBeep(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = success ? 880 : 260;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (_) { /* audio feedback optional */ }
}

// ===================================================
// MASTER DASHBOARD COMPONENT
// ===================================================
export default function Dashboard({ token, user, setUser, navigate, logout, openAuth, showNotice }) {
  const role = user?.role || "customer";
  const [tab, setTab] = useState(() => (role === "staff" ? "scanner" : "overview"));
  const [loading, setLoading] = useState(true);

  // Platform Data
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [playgrounds, setPlaygrounds] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [incomeData, setIncomeData] = useState(null);
  const [slotsList, setSlotsList] = useState([]);
  const [reportableCustomers, setReportableCustomers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Interactive Modals & Confirm Dialogs
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [slotDate, setSlotDate] = useState(() => isoDate());
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myPayments, setMyPayments] = useState([]);

  useEffect(() => {
    if (role === "staff" && tab === "overview") {
      setTab("scanner");
    }
  }, [role, tab]);

  // Build role-based side nav items matching dashboard.js
  const navItems = useMemo(() => {
    if (role === "staff") {
      return [
        { id: "scanner", label: "QR Scanner", icon: "booking" },
        { id: "checkins", label: "Gate Check-ins", icon: "bookings" },
        { id: "account", label: "My Profile", icon: "account" }
      ];
    }

    const items = [
      { id: "overview", label: "Overview", icon: "overview" },
      { id: "tournaments", label: "Tournaments", icon: "tournament", action: () => navigate("tournaments") },
      { id: "account", label: "Account centre", icon: "account" }
    ];
    if (role === "customer") {
      items.splice(1, 0,
        { id: "find-playgrounds", label: "Find playgrounds", icon: "playgrounds", action: () => navigate("venues") },
        { id: "my-bookings", label: "My bookings", icon: "bookings" }
      );
    }
    if (role === "playground-admin") {
      items.splice(2, 0,
        { id: "playgrounds", label: "Venue management", icon: "venue" },
        { id: "slots", label: "Slots", icon: "slots" },
        { id: "bookings", label: "Bookings", icon: "bookings" },
        { id: "staff", label: "Staff & Employees", icon: "users" },
        { id: "scanner", label: "QR scanner", icon: "booking" },
        { id: "income", label: "Income", icon: "income" }
      );
    }
    items.splice(items.length - 1, 0, { id: "reports", label: "Reports", icon: "reports" });
    if (role === "super-admin") {
      items.splice(items.length - 2, 0,
        { id: "playgrounds", label: "Playground control", icon: "venue" },
        { id: "users", label: "User control", icon: "users" }
      );
    }
    return items;
  }, [role, navigate]);

  // Load All Workspace Data
  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Tournaments & Live Matches
      const tourneys = await request("/tournaments", { token }).catch(() => []);
      setTournaments(tourneys || []);

      if (tourneys?.length) {
        const matchPromises = tourneys.slice(0, 6).map((t) => request(`/tournaments/${t._id}/matches`).catch(() => []));
        const resMatches = await Promise.all(matchPromises);
        setMatches(resMatches.flat());
      }

      // 2. Notifications
      const notifs = await request("/notifications", { token }).catch(() => []);
      setNotifications(notifs || []);

      // 3. Customer Role Data
      if (role === "customer") {
        const [myB, myR, allP, myTeams, myPmts] = await Promise.all([
          request("/bookings/my-bookings", { token }).catch(() => []),
          request("/reports/my-reports", { token }).catch(() => []),
          request("/playgrounds").catch(() => []),
          request("/tournaments/my-registrations", { token }).catch(() => []),
          request("/payments/my-payments", { token }).catch(() => [])
        ]);
        setBookings(myB || []);
        setMyReports(myR || []);
        setPlaygrounds(allP || []);
        setMyRegistrations(myTeams || []);
        setMyPayments(myPmts || []);
      }

      // 4. Playground Admin Data
      if (role === "playground-admin") {
        const [myGrounds, income, repCust, myR, myStaff] = await Promise.all([
          request("/playgrounds/my-playgrounds", { token }).catch(() => []),
          request("/payments/playground-admin/income", { token }).catch(() => null),
          request("/reports/reportable-customers", { token }).catch(() => []),
          request("/reports/my-reports", { token }).catch(() => []),
          request("/users/my-staff", { token }).catch(() => [])
        ]);
        setPlaygrounds(myGrounds || []);
        setIncomeData(income);
        setReportableCustomers(repCust || []);
        setMyReports(myR || []);
        setStaffList(myStaff || []);

        if (myGrounds?.length) {
          const slotPromises = myGrounds.map(async (ground) => {
            const groundSlots = await request(`/slots/playground/${ground._id}`, { token }).catch(() => []);
            const groundBookings = await request(`/bookings/playground/${ground._id}`, { token }).catch(() => []);
            return {
              ground,
              slots: (groundSlots || []).map((s) => ({ ...s, groundName: ground.name })),
              bookings: groundBookings || []
            };
          });
          const details = await Promise.all(slotPromises);
          setSlotsList(details);
          const allB = details.flatMap((d) => d.bookings.map((b) => ({ ...b, playground: d.ground })));
          setBookings(allB);
        }
      }

      // 5. Staff Employee Data
      if (role === "staff") {
        const staffGroundId = user?.assignedPlayground?._id || user?.assignedPlayground;
        if (staffGroundId) {
          const [groundBookings, groundInfo] = await Promise.all([
            request(`/bookings/playground/${staffGroundId}`, { token }).catch(() => []),
            request(`/playgrounds/${staffGroundId}`).catch(() => null)
          ]);
          setBookings(groundBookings || []);
          if (groundInfo) {
            setPlaygrounds([groundInfo]);
          }
        }
      }

      // 6. Super Admin Data
      if (role === "super-admin") {
        const [allP, users, reports] = await Promise.all([
          request("/playgrounds/admin/all", { token }).catch(() => []),
          request("/users", { token }).catch(() => []),
          request("/reports?limit=100", { token }).catch(() => [])
        ]);
        setPlaygrounds(allP || []);
        setAllUsers(users || []);
        setAllReports(reports || []);
      }
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, role]);

  const markAllNotificationsRead = async () => {
    try {
      await request("/notifications/read-all", { method: "PATCH", token });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showNotice("All notifications marked as read.");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  if (!user) {
    return (
      <main className="portal login-prompt">
        <h1>Your game plan, all in one place.</h1>
        <p>Sign in to view your dashboard, bookings, venue controls, and matches.</p>
        <button className="button" onClick={openAuth}>Sign in to continue</button>
      </main>
    );
  }

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="dashboard-shell">
      {/* Mobile Top App Header (<= 930px) */}
      <header className="mobile-dashboard-header">
        <a className="mobile-brand" href="#" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
          <img src="/legacy/assets/images/favicon.png" alt="TURF" />
          <div className="mobile-brand-copy">
            <span className="mobile-brand-name">TURF</span>
            <span className={`mobile-role-pill role-${role}`}>{role.replace("-", " ")}</span>
          </div>
        </a>

        <div className="mobile-header-tools">
          {/* Notification Button */}
          <div className="mobile-notif-wrap">
            <button
              className="mobile-notif-btn"
              type="button"
              aria-label="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotifs > 0 && <span className="mobile-notif-badge">{unreadNotifs}</span>}
            </button>

            {showNotifications && (
              <section className="mobile-notification-menu">
                <header>
                  <div>
                    <strong>Notifications</strong>
                    <span>Stay up to date</span>
                  </div>
                  {unreadNotifs > 0 && (
                    <button type="button" onClick={markAllNotificationsRead}>Mark all read</button>
                  )}
                </header>
                <div className="mobile-notification-list">
                  {notifications.length ? (
                    notifications.slice(0, 8).map((n) => (
                      <div key={n._id} className={`notification-item ${n.isRead ? "" : "unread"}`}>
                        <strong>{n.title || "Notification"}</strong>
                        <p>{n.message}</p>
                        <span>{prettyDate(n.createdAt)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="notification-empty">No notifications yet.</p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Avatar button */}
          <button
            className="mobile-avatar"
            type="button"
            style={user.profileImage ? { backgroundImage: `url(${user.profileImage})` } : {}}
            onClick={() => setTab("account")}
            title="Account Settings"
          >
            {!user.profileImage && (user.name?.[0] || "U").toUpperCase()}
          </button>

          {/* Logout button */}
          <button
            className="mobile-logout-btn"
            type="button"
            onClick={logout}
            title="Log out"
            aria-label="Log out"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="21" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Pill Navigation Bar (<= 930px) */}
      <nav className="mobile-dashboard-nav" aria-label="Dashboard navigation">
        <div className="mobile-nav-track">
          {navItems.map((item) => (
            <button
              key={`m-${item.id}`}
              className={`mobile-nav-pill ${tab === item.id ? "active" : ""}`}
              onClick={() => {
                if (item.action) item.action();
                else setTab(item.id);
              }}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar (> 930px) */}
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-brand-row" style={{ padding: "8px 4px 16px", borderBottom: "1px solid #f1f5f9", marginBottom: "14px" }}>
          <div
            className="brand"
            role="button"
            tabIndex={0}
            onClick={() => navigate("home")}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
          >
            <img src="/legacy/assets/images/favicon.png" alt="TURF" style={{ width: "36px", height: "36px", borderRadius: "8px", padding: "2px", background: "#f0fdf4", border: "1px solid #dcfce7" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#065f46", letterSpacing: "-0.03em", lineHeight: 1 }}>TURF</span>
              <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "3px" }}>
                {role.replace("-", " ")} portal
              </span>
            </div>
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => {
                if (item.action) item.action();
                else setTab(item.id);
              }}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <a className="back-home" href="#" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
          ← Back to website
        </a>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Desktop Topbar */}
        <header className="topbar dashboard-topbar desktop-topbar">
          <div className="topbar-welcome-col">
            <span className="eyebrow-pill">{role.replace("-", " ").toUpperCase()} PORTAL</span>
            <h1 className="dashboard-welcome-heading">Welcome back, {user.name?.split(" ")[0] || "Player"}! 👋</h1>
          </div>

          <div className="topbar-tools">
            {/* Live Weather / Date Widget */}
            <div className="weather-date">
              <span className="weather-icon">🌤️</span>
              <div>
                <strong>Dhaka 28°C</strong>
                <span>{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
            </div>

            {/* Notifications Menu */}
            <div className="notification-wrap">
              <button
                className="notification-button"
                type="button"
                aria-label="Open notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotifs > 0 && <span className="notif-badge">{unreadNotifs}</span>}
              </button>

              {showNotifications && (
                <section className="notification-menu">
                  <header>
                    <div>
                      <strong>Notifications</strong>
                      <span>Stay up to date</span>
                    </div>
                    {unreadNotifs > 0 && (
                      <button type="button" onClick={markAllNotificationsRead}>Mark all read</button>
                    )}
                  </header>
                  <div>
                    {notifications.length ? (
                      notifications.slice(0, 8).map((n) => (
                        <div key={n._id} className={`notification-item ${n.isRead ? "" : "unread"}`}>
                          <strong>{n.title || "Notification"}</strong>
                          <p>{n.message}</p>
                          <span>{prettyDate(n.createdAt)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="notification-empty">No notifications yet.</p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Account Menu */}
            <div className="account-menu">
              <div
                className="avatar"
                style={user.profileImage ? { backgroundImage: `url(${user.profileImage})` } : {}}
                onClick={() => setTab("account")}
                title="Account Settings"
              >
                {!user.profileImage && (user.name?.[0] || "U").toUpperCase()}
              </div>
              <div className="account-copy" onClick={() => setTab("account")} style={{ cursor: "pointer" }}>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <button className="logout-button" type="button" onClick={logout}>Log out</button>
            </div>
          </div>
        </header>

        {/* Dashboard Body Area */}
        <div className="dashboard-body">
          {loading ? (
            <div className="loading-card">Preparing your workspace…</div>
          ) : (
            <>
              {/* Back to Overview button when in any inner tab */}
              {tab !== (role === "staff" ? "scanner" : "overview") && (
                <div className="tab-back-toolbar" style={{ marginBottom: "16px" }}>
                  <button
                    type="button"
                    className="page-back-button"
                    onClick={() => setTab(role === "staff" ? "scanner" : "overview")}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>Back to {role === "staff" ? "QR Scanner" : "Overview"}</span>
                  </button>
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {tab === "overview" && (
                <OverviewTab
                  role={role}
                  user={user}
                  bookings={bookings}
                  tournaments={tournaments}
                  playgrounds={playgrounds}
                  slotsList={slotsList}
                  incomeData={incomeData}
                  allUsers={allUsers}
                  matches={matches}
                  setTab={setTab}
                  setActiveModal={setActiveModal}
                  setModalData={setModalData}
                  navigate={navigate}
                />
              )}

              {/* TAB 2: MY BOOKINGS (CUSTOMER) */}
              {tab === "my-bookings" && (
                <CustomerBookingsTab
                  bookings={bookings}
                  myRegistrations={myRegistrations}
                  myPayments={myPayments}
                  token={token}
                  user={user}
                  showNotice={showNotice}
                  reload={loadData}
                  setActiveModal={setActiveModal}
                  setModalData={setModalData}
                  setConfirmDialog={setConfirmDialog}
                  navigate={navigate}
                />
              )}

              {/* TAB 3: VENUE MANAGEMENT (PLAYGROUND ADMIN) */}
              {tab === "playgrounds" && role === "playground-admin" && (
                <VenueManagementTab
                  playgrounds={playgrounds}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                  setActiveModal={setActiveModal}
                  setModalData={setModalData}
                  setConfirmDialog={setConfirmDialog}
                />
              )}

              {/* TAB 4: PLAYGROUND CONTROL (SUPER ADMIN) */}
              {tab === "playgrounds" && role === "super-admin" && (
                <SuperAdminPlaygroundsTab
                  playgrounds={playgrounds}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                  setActiveModal={setActiveModal}
                  setModalData={setModalData}
                  setConfirmDialog={setConfirmDialog}
                />
              )}

              {/* TAB 5: SLOTS (PLAYGROUND ADMIN) */}
              {tab === "slots" && (
                <SlotsManagementTab
                  playgrounds={playgrounds}
                  slotsList={slotsList}
                  slotDate={slotDate}
                  setSlotDate={setSlotDate}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                  setActiveModal={setActiveModal}
                  setModalData={setModalData}
                  setConfirmDialog={setConfirmDialog}
                />
              )}

              {/* TAB 6: BOOKINGS (PLAYGROUND ADMIN) */}
              {tab === "bookings" && role === "playground-admin" && (
                <AdminBookingsTab
                  bookings={bookings}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                  setActiveModal={setActiveModal}
                  setModalData={setModalData}
                  setConfirmDialog={setConfirmDialog}
                />
              )}

              {/* TAB 7: STAFF MANAGEMENT (PLAYGROUND ADMIN) */}
              {tab === "staff" && role === "playground-admin" && (
                <StaffManagementTab
                  staffList={staffList}
                  playgrounds={playgrounds}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                  setActiveModal={setActiveModal}
                  setModalData={setModalData}
                  setConfirmDialog={setConfirmDialog}
                />
              )}

              {/* TAB 8: QR SCANNER (PLAYGROUND ADMIN & STAFF) */}
              {tab === "scanner" && (
                <QRScannerTab
                  token={token}
                  showNotice={showNotice}
                  user={user}
                  bookings={bookings}
                  reload={loadData}
                />
              )}

              {/* TAB 9: GATE CHECK-INS (STAFF) */}
              {tab === "checkins" && (
                <GateCheckinsTab
                  bookings={bookings}
                  user={user}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                />
              )}

              {/* TAB 8: INCOME (PLAYGROUND ADMIN) */}
              {tab === "income" && (
                <IncomeTab
                  incomeData={incomeData}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                  setConfirmDialog={setConfirmDialog}
                />
              )}

              {/* TAB 9: USER CONTROL (SUPER ADMIN) */}
              {tab === "users" && (
                <UserControlTab
                  users={allUsers}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                  setConfirmDialog={setConfirmDialog}
                />
              )}

              {/* TAB 10: REPORTS */}
              {tab === "reports" && (
                <ReportsTab
                  role={role}
                  myReports={myReports}
                  allReports={allReports}
                  playgrounds={playgrounds}
                  reportableCustomers={reportableCustomers}
                  token={token}
                  showNotice={showNotice}
                  reload={loadData}
                />
              )}

              {/* TAB 11: ACCOUNT CENTRE / PROFILE */}
              {tab === "account" && (
                <AccountCentreTab
                  user={user}
                  setUser={setUser}
                  token={token}
                  showNotice={showNotice}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Global Modals */}
      {activeModal && (
        <Modals
          modal={activeModal}
          data={modalData}
          close={() => { setActiveModal(null); setModalData(null); }}
          token={token}
          showNotice={showNotice}
          reload={loadData}
          playgrounds={playgrounds}
        />
      )}

      {/* TurfDialog Confirmation Box (matching legacy ui-dialog.js) */}
      {confirmDialog && (
        <TurfDialogModal dialog={confirmDialog} close={() => setConfirmDialog(null)} />
      )}
    </div>
  );
}

// ===================================================
// SECTION 1: OVERVIEW TAB
// ===================================================
function OverviewTab({
  role, user, bookings, tournaments, playgrounds, slotsList, incomeData, allUsers, matches, setTab, setActiveModal, setModalData, navigate
}) {
  const superAdmin = role === "super-admin";
  const upcomingBookings = bookings.filter((b) => !["Cancelled", "Completed"].includes(b.bookingStatus));
  const displayBookings = upcomingBookings.length > 0 ? upcomingBookings : bookings.filter((b) => b.bookingStatus !== "Cancelled");
  const activeSlotsCount = slotsList.flatMap((d) => d.slots).filter((s) => s.isActive).length;

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      {/* Premium Hero Greeting Banner */}
      <div className="dashboard-hero-banner">
        <div className="dashboard-hero-content">
          <span className="dashboard-hero-eyebrow">
            TURF WORKSPACE HUB · {role.replace("-", " ").toUpperCase()}
          </span>
          <h2 className="dashboard-hero-title">
            {timeGreeting}, {user?.name?.split(" ")[0] || "Player"}! 👋
          </h2>
          <p className="dashboard-hero-subtitle">
            {role === "customer" && "Ready for your next game? Review your entry tickets, check live fixtures, or reserve a fresh slot."}
            {role === "playground-admin" && "Monitor daily venue slots, view earnings, handle cash refunds, and scan check-in QR passes."}
            {role === "staff" && "Welcome to the venue gate checkpoint. Scan customer QR passes, verify tickets, and ensure smooth ground entry."}
            {role === "super-admin" && "Control platform-wide ground approvals, user roles, active disputes, and system reports."}
          </p>
        </div>

        <div className="dashboard-hero-badge-wrap">
          <span className="dashboard-hero-badge">
            <span className="dashboard-hero-beacon" />
            Dhaka Hub Live
          </span>
        </div>
      </div>
      {/* Role Stats Row */}
      <section className="stats">
        {role === "customer" && (
          <>
            <article className="stat-card"><span>Active bookings</span><strong>{upcomingBookings.length > 0 ? upcomingBookings.length : bookings.length}</strong></article>
            <article className="stat-card"><span>Available tournaments</span><strong>{tournaments.length}</strong></article>
            <article className="stat-card"><span>Booking history</span><strong>{bookings.length}</strong></article>
          </>
        )}
        {role === "playground-admin" && (
          <>
            <article className="stat-card"><span>Live tournaments</span><strong>{tournaments.length}</strong></article>
            <article className="stat-card"><span>My playgrounds</span><strong>{playgrounds.length}</strong></article>
            <article className="stat-card"><span>Active slot schedules</span><strong>{activeSlotsCount}</strong></article>
          </>
        )}
        {role === "staff" && (
          <>
            <article className="stat-card"><span>Assigned Gate</span><strong>{user?.assignedPlayground?.name || "Assigned Venue"}</strong></article>
            <article className="stat-card"><span>Today's ground bookings</span><strong>{bookings.length}</strong></article>
            <article className="stat-card"><span>Security role</span><strong>{user?.staffTitle || "Gatekeeper / Staff"}</strong></article>
          </>
        )}
        {role === "super-admin" && (
          <>
            <article className="stat-card"><span>Customers</span><strong>{allUsers.filter((u) => u.role === "customer").length}</strong></article>
            <article className="stat-card"><span>Playgrounds</span><strong>{playgrounds.length}</strong></article>
            <article className="stat-card"><span>Playground admins</span><strong>{allUsers.filter((u) => u.role === "playground-admin").length}</strong></article>
          </>
        )}
      </section>

      {/* Live & Upcoming Tournaments Ticker */}
      {tournaments.length > 0 && (
        <div className="modern-ticker-wrapper">
          <div className="ticker-badge-pill">
            <span className="ticker-pulse-beacon" />
            <span className="ticker-badge-text">LIVE TOURNAMENTS</span>
          </div>

          <div className="ticker-marquee-viewport">
            <div className="ticker-track">
              {/* Duplicate list for seamless infinite marquee scroll */}
              {[...tournaments, ...tournaments].map((t, idx) => {
                const ground = t.playgrounds?.[0] || t.playground || {};
                return (
                  <div
                    key={`${t._id}-${idx}`}
                    className="ticker-item-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("tournaments")}
                    onKeyDown={(e) => e.key === "Enter" && navigate("tournaments")}
                  >
                    <span className="ticker-sport-pill">{t.sportType || "Football"}</span>
                    <strong className="ticker-tourney-name">{t.name}</strong>
                    <span className="ticker-venue-meta">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {ground.name || "Dhaka Arena"}
                    </span>
                    <span className="ticker-date-meta">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {prettyDate(t.startDate)}
                    </span>
                    <span className={`ticker-status-tag ${(t.status || "upcoming").toLowerCase()}`}>
                      {t.status || "Upcoming"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="ticker-explore-btn"
            onClick={() => navigate("tournaments")}
            title="Browse all tournaments"
          >
            <span>All Cups</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Customer Pinned Bookings */}
      {role === "customer" && (
        <>
          <div className="section-heading">
            <div>
              <h2>{upcomingBookings.length > 0 ? "Pinned for you" : "Recent Bookings & Passes"}</h2>
              <p>{upcomingBookings.length > 0 ? "Your upcoming bookings stay at the top." : "Your latest confirmed ground sessions and QR entry passes."}</p>
            </div>
            <button className="text-link" onClick={() => setTab("my-bookings")}>Manage bookings →</button>
          </div>
          <section className="pinned-grid">
            {displayBookings.length ? (
              displayBookings.slice(0, 3).map((b) => (
                <article key={b._id} className="pin-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span className={`status ${b.bookingStatus?.toLowerCase()}`}>
                      {b.bookingStatus} · {b.paymentStatus || "Unpaid"}
                    </span>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#15803d" }}>
                      {prettyDate(b.bookingDate)}
                    </span>
                  </div>
                  <h3>{b.playground?.name || "Playground booking"}</h3>
                  <p>
                    <strong>Time:</strong> {b.startTime} – {b.endTime}<br />
                    <strong>Location:</strong> {b.playground?.address || b.playground?.area || "Location details will be shared"}
                  </p>
                  <button
                    type="button"
                    className="button"
                    style={{ marginTop: "12px", width: "100%", fontSize: "0.78rem", minHeight: "36px", padding: "8px 12px" }}
                    onClick={() => { setActiveModal("view-ticket"); setModalData(b); }}
                  >
                    View Digital QR Pass
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state">No active booking yet. Book a slot and it will appear here.</div>
            )}
          </section>
        </>
      )}

      {/* Playground Admin Quick Setup & Income Overview */}
      {role === "playground-admin" && (
        <>
          {incomeData && (
            <section className="income-dashboard">
              <div className="section-heading">
                <div>
                  <h2>Income overview</h2>
                  <p>Paid earnings from your own playgrounds.</p>
                </div>
                <button className="text-link" onClick={() => setTab("income")}>Full income report →</button>
              </div>

              <div className="income-stat-grid">
                <article>
                  <span className="income-icon slot-icon">◷</span>
                  <div>
                    <span>Slot income</span>
                    <strong>৳{new Intl.NumberFormat("en-BD").format(incomeData.slotTotal || 0)}</strong>
                  </div>
                </article>
                <article>
                  <span className="income-icon tournament-icon">★</span>
                  <div>
                    <span>Tournament income</span>
                    <strong>৳{new Intl.NumberFormat("en-BD").format(incomeData.tournamentTotal || 0)}</strong>
                  </div>
                </article>
                <article className="income-grand-total">
                  <span>Total income</span>
                  <strong>৳{new Intl.NumberFormat("en-BD").format(incomeData.total || 0)}</strong>
                </article>
              </div>
            </section>
          )}

          <div className="section-heading">
            <div>
              <h2>Availability by playground</h2>
              <p>Each venue has a separate schedule for clearer operations.</p>
            </div>
            <button className="text-link" onClick={() => setTab("slots")}>Manage schedules →</button>
          </div>

          <section className="availability-grid">
            {slotsList.length ? (
              slotsList.map(({ ground, slots }) => {
                const active = slots.filter((s) => s.isActive);
                return (
                  <article key={ground._id} className="availability-card">
                    <header>
                      <div>
                        <span className="venue-kicker">VENUE AVAILABILITY</span>
                        <h3>{ground.name}</h3>
                        <p>{ground.address || ground.area || "Address pending"}</p>
                      </div>
                      <a href="#" onClick={(e) => { e.preventDefault(); setTab("slots"); }}>Manage</a>
                    </header>
                    <div className="availability-summary">
                      <strong>{active.length}</strong>
                      <span>active weekly slots</span>
                    </div>
                    <div className="availability-times">
                      {active.length ? (
                        active.slice(0, 5).map((s) => (
                          <span key={s._id}>{s.startTime}–{s.endTime}</span>
                        ))
                      ) : (
                        <em>No active slots configured</em>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">Add your first playground from Venue management to set availability.</div>
            )}
          </section>

          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <p className="subtitle">Get started by registering a playground or configuring time slots.</p>
            <div className="action-grid">
              <a href="#" className="action-card" onClick={(e) => { e.preventDefault(); setActiveModal("add-playground"); }}>
                <div className="action-icon">+</div>
                <div>
                  <h3>Add Playground</h3>
                  <p>Register a new venue with sport type, pricing, and schedule.</p>
                </div>
              </a>
              <a href="#" className="action-card" onClick={(e) => { e.preventDefault(); setActiveModal("add-slots"); }}>
                <div className="action-icon">⏱</div>
                <div>
                  <h3>Add Slots</h3>
                  <p>Configure daily slots, duration, and availability per sport.</p>
                </div>
              </a>
            </div>
          </section>
        </>
      )}

      {/* Match Results & Live Scoreboard */}
      {matches.length > 0 && (
        <section className="match-results-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MATCH UPDATES</span>
              <h2>Scores & fixtures</h2>
              <p>Live games, next fixtures and official results — refreshed automatically.</p>
            </div>
            <button className="text-link" onClick={() => navigate("tournaments")}>Open fixtures →</button>
          </div>
          <div className="match-results-grid">
            {matches.slice(0, 4).map((m) => {
              const live = m.matchStatus === "Live";
              const completed = m.matchStatus === "Completed";
              const cricket = m.tournament?.sportType === "Cricket";
              return (
                <article key={m._id} className={`match-result-card ${live ? "live" : ""}`}>
                  <div className="match-result-meta">
                    <span className={`status ${live ? "live" : ""}`}>{live ? "LIVE NOW" : completed ? "FULL TIME" : "UP NEXT"}</span>
                    <span>{prettyDate(m.matchDate)} · {m.startTime}</span>
                  </div>
                  <div className="match-score">
                    <strong>{m.teamA?.teamName || "Team A"}</strong>
                    <b>{live || completed ? `${m.teamAScore || 0} – ${m.teamBScore || 0}` : "VS"}</b>
                    <strong>{m.teamB?.teamName || "Team B"}</strong>
                  </div>
                  <p>{m.playground?.name || "Tournament venue"} · {m.stage || "Match"}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Activity Panels */}
      <section className="split-grid">
        <article className="panel activity-bookings">
          <div className="activity-panel-header">
            <div className="activity-panel-title-wrap">
              <span className="activity-icon-badge bookings-badge">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div>
                <h2 className="panel-title">{superAdmin ? "Platform Tournaments" : upcomingBookings.length > 0 ? "Upcoming Bookings" : "Recent Bookings & Passes"}</h2>
                <p className="activity-intro">{superAdmin ? "Latest tournament registrations across the platform." : upcomingBookings.length > 0 ? "Your next confirmed and pending playground slots." : "Your latest confirmed and completed ground slots."}</p>
              </div>
            </div>
            {!superAdmin && (
              <button
                type="button"
                className="activity-action-btn"
                onClick={() => setTab("my-bookings")}
              >
                View all →
              </button>
            )}
          </div>

          <div className="list">
            {superAdmin ? (
              tournaments.slice(0, 5).map((t) => (
                <div key={t._id} className="list-row activity-row">
                  <div className="activity-item-main">
                    <div className="item-title">{t.name}</div>
                    <p className="item-meta">
                      <span className="meta-tag">{t.sportType}</span>
                      <span>{prettyDate(t.startDate)}</span>
                    </p>
                  </div>
                  <span className={`status ${(t.status || "upcoming").toLowerCase()}`}>{t.status || "Upcoming"}</span>
                </div>
              ))
            ) : displayBookings.length ? (
              displayBookings.slice(0, 5).map((b) => (
                <div key={b._id} className="list-row activity-row">
                  <div className="activity-item-main">
                    <div className="item-title">{b.playground?.name || "Playground booking"}</div>
                    <p className="item-meta">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{prettyDate(b.bookingDate)} · {b.startTime}–{b.endTime}</span>
                    </p>
                  </div>
                  <span className={`status ${b.bookingStatus?.toLowerCase()}`}>{b.bookingStatus}</span>
                </div>
              ))
            ) : (
              <div className="activity-modern-empty">
                <div className="empty-icon-wrap emerald">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h4>No upcoming bookings yet</h4>
                <p>You don't have any booked turf slots right now. Reserve a ground for your next match!</p>
                <button
                  type="button"
                  className="activity-empty-btn"
                  onClick={() => navigate("venues")}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Book a Turf Slot
                </button>
              </div>
            )}
          </div>
        </article>

        <article className="panel activity-tournaments">
          <div className="activity-panel-header">
            <div className="activity-panel-title-wrap">
              <span className="activity-icon-badge tournaments-badge">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                  <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </span>
              <div>
                <h2 className="panel-title">{superAdmin ? "Venue Overview" : "Tournament Updates"}</h2>
                <p className="activity-intro">{superAdmin ? "All venues active on the platform." : "Competition status, fixtures and important updates."}</p>
              </div>
            </div>
            <button
              type="button"
              className="activity-action-btn"
              onClick={() => navigate("tournaments")}
            >
              Explore →
            </button>
          </div>

          <div className="list">
            {superAdmin ? (
              playgrounds.slice(0, 5).map((g) => (
                <div key={g._id} className="list-row activity-row">
                  <div className="activity-item-main">
                    <div className="item-title">{g.name}</div>
                    <p className="item-meta">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{g.area || g.address || "Location pending"}</span>
                    </p>
                  </div>
                  <span className={`status ${g.isApproved ? "confirmed" : "pending"}`}>{g.status || "Active"}</span>
                </div>
              ))
            ) : tournaments.length ? (
              tournaments.slice(0, 5).map((t) => {
                const ground = t.playgrounds?.[0] || t.playground || {};
                return (
                  <div key={t._id} className="list-row activity-row">
                    <div className="activity-item-main">
                      <div className="item-title">{t.name}</div>
                      <p className="item-meta">
                        <span className="meta-tag">{t.sportType || "Tournament"}</span>
                        <span>{ground.name || "Venue TBD"} · {prettyDate(t.startDate)}</span>
                      </p>
                    </div>
                    <span className="status">{t.status || "Upcoming"}</span>
                  </div>
                );
              })
            ) : (
              <div className="activity-modern-empty">
                <div className="empty-icon-wrap amber">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                    <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <h4>No tournament updates yet</h4>
                <p>No active competitions or fixtures running right now. Browse upcoming tournaments!</p>
                <button
                  type="button"
                  className="activity-empty-btn outline"
                  onClick={() => navigate("tournaments")}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Browse Tournaments
                </button>
              </div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}

// ===================================================
// SECTION 2: CUSTOMER MY BOOKINGS & QR PASSES (Authentic)
// ===================================================
function CustomerBookingsTab({
  bookings,
  myRegistrations = [],
  myPayments = [],
  token,
  user,
  showNotice,
  reload,
  setActiveModal,
  setModalData,
  setConfirmDialog,
  navigate
}) {
  const [activeSubTab, setActiveSubTab] = useState("bookings");
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? bookings : bookings.filter((b) => b.bookingStatus === filter);

  // Paid payments and bookings with confirmed QR passes
  const paidPayments = myPayments.filter((p) => p.paymentStatus === "Paid");
  const paidBookings = bookings.filter((b) => b.paymentStatus === "Paid");

  const handleCancelClick = (booking) => {
    setConfirmDialog({
      title: "Cancel this booking?",
      message: `Cancel reservation for ${booking.playground?.name || "Playground"} on ${prettyDate(booking.bookingDate)} (${booking.startTime}–${booking.endTime})? Any paid amount will be refunded according to venue policy.`,
      confirmLabel: "Cancel & refund",
      danger: true,
      onConfirm: async () => {
        try {
          await request(`/bookings/${booking._id}/cancel`, { method: "PATCH", token });
          showNotice("Booking cancelled successfully.");
          reload();
        } catch (err) {
          showNotice(err.message, "error");
        }
      }
    });
  };

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>My bookings &amp; entry passes</h2>
          <p>Access your reserved ground slots, digital tickets and cancellation options.</p>
        </div>
      </div>

      {/* Top Authentic Tabs */}
      <div className="tabs" style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
        <button
          className={activeSubTab === "bookings" ? "active" : ""}
          onClick={() => setActiveSubTab("bookings")}
          style={{ minHeight: "42px", padding: "10px 18px", fontWeight: 700 }}
        >
          My bookings
        </button>
        <button
          className={activeSubTab === "tickets" ? "active" : ""}
          onClick={() => setActiveSubTab("tickets")}
          style={{ minHeight: "42px", padding: "10px 18px", fontWeight: 700 }}
        >
          My QR tickets ({paidPayments.length || paidBookings.length})
        </button>
      </div>

      {activeSubTab === "bookings" ? (
        <>
          <div className="nav-subtabs">
            {["All", "Confirmed", "Pending", "Cancelled"].map((f) => (
              <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>

          <div className="pinned-grid">
            {filtered.length ? (
              filtered.map((b) => (
                <article key={b._id} className="card">
                  <span className={`status ${b.bookingStatus?.toLowerCase()}`}>
                    {b.bookingStatus} · {b.paymentStatus || "Unpaid"}
                  </span>
                  <h3>{b.playground?.name || "Playground booking"}</h3>
                  <p>
                    <strong>Date:</strong> {prettyDate(b.bookingDate)}<br />
                    <strong>Time:</strong> {b.startTime} – {b.endTime}<br />
                    <strong>Location:</strong> {b.playground?.address || "Location will be confirmed"}<br />
                    <strong>Total:</strong> ৳{new Intl.NumberFormat("en-BD").format(b.totalAmount || b.pricing || 0)}
                  </p>
                  <div className="card-foot">
                    {b.paymentStatus === "Paid" ? (
                      <button
                        type="button"
                        className="button"
                        onClick={() => { setActiveModal("view-ticket"); setModalData(b); }}
                      >
                        View QR pass
                      </button>
                    ) : b.bookingStatus !== "Cancelled" ? (
                      <button
                        type="button"
                        className="button"
                        onClick={() => { setActiveModal("view-ticket"); setModalData(b); }}
                      >
                        Pay &amp; get pass
                      </button>
                    ) : null}

                    {b.playground?.phone && (
                      <button
                        type="button"
                        className="button alt"
                        onClick={() => showNotice("Playground Admin Phone: " + b.playground.phone)}
                      >
                        Chat with admin
                      </button>
                    )}

                    {["Pending", "Confirmed"].includes(b.bookingStatus) && (
                      <button
                        type="button"
                        className="button alt"
                        onClick={() => handleCancelClick(b)}
                      >
                        Cancel booking
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No bookings found under this filter.</div>
            )}

            {/* Active Tournament Registrations */}
            {myRegistrations.map((team) => (
              <article key={team._id} className="card">
                <span className="badge">TOURNAMENT · PAID</span>
                <h3>{team.teamName}</h3>
                <p>
                  <strong>Tournament:</strong> {team.tournament?.name || "Tournament"}<br />
                  <strong>Dates:</strong> {prettyDate(team.tournament?.startDate)} – {prettyDate(team.tournament?.endDate)}<br />
                  <strong>Registration:</strong> ৳{new Intl.NumberFormat("en-BD").format(team.tournament?.registrationFee || 0)}
                </p>
                <div className="card-foot">
                  <button
                    type="button"
                    className="button alt"
                    onClick={() => navigate("tournaments")}
                  >
                    View fixture
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      setActiveModal("view-receipt");
                      setModalData({
                        tournamentTeam: team,
                        playground: team.tournament?.name,
                        amount: team.tournament?.registrationFee,
                        createdAt: team.createdAt
                      });
                    }}
                  >
                    View receipt
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        /* Authentic Ticket Grid */
        <div className="ticket-grid">
          {(paidPayments.length ? paidPayments : paidBookings).length ? (
            (paidPayments.length ? paidPayments : paidBookings).map((item) => {
              const b = item.booking || item;
              const title = b.playground?.name || item.tournamentTeam?.tournament?.name || "TURF Entry Pass";
              const schedule = b.bookingDate
                ? `${prettyDate(b.bookingDate)} · ${b.startTime} - ${b.endTime}`
                : (item.tournamentTeam ? `Team: ${item.tournamentTeam.teamName}` : "Confirmed Reservation");
              const amount = item.amount || b.totalAmount || b.pricing || 0;
              const qrUrl = b.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b._id || item._id)}`;

              return (
                <article key={item._id || b._id} className="card ticket">
                  <div className="ticket-copy">
                    <div>
                      <span className="badge">PAID TICKET</span>
                      <h3>{title}</h3>
                      <p>
                        {schedule}<br />
                        Paid: BDT {new Intl.NumberFormat("en-BD").format(amount)}
                      </p>
                    </div>
                    <div className="ticket-actions">
                      <button
                        type="button"
                        className="button alt"
                        onClick={() => {
                          setActiveModal("view-receipt");
                          setModalData({ booking: b, ...item, amount, title });
                        }}
                      >
                        View receipt
                      </button>
                    </div>
                  </div>
                  <aside className="ticket-qr">
                    <span className="ticket-qr-label">ENTRY QR</span>
                    <div className="ticket-qr-frame">
                      <img className="ticket-qr-image" src={qrUrl} alt="QR ticket" />
                    </div>
                    <small>Show this code at venue entry</small>
                  </aside>
                </article>
              );
            })
          ) : (
            <div className="empty-state full" style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center" }}>
              <h3>No paid tickets yet</h3>
              <p style={{ color: "#68766d", margin: "8px 0 16px" }}>Complete a slot booking or tournament registration to receive your entry pass with QR code.</p>
              <button className="button" onClick={() => navigate("venues")}>Find playgrounds</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================================================
// SECTION 3: PLAYGROUND ADMIN VENUE MANAGEMENT
// ===================================================
function VenueManagementTab({ playgrounds, token, showNotice, reload, setActiveModal, setModalData, setConfirmDialog }) {
  const handleDeleteGround = (ground) => {
    setConfirmDialog({
      title: `Delete ${ground.name}?`,
      message: "This will permanently remove the playground and its public listing. Active bookings will be affected.",
      confirmLabel: "Delete playground",
      danger: true,
      onConfirm: async () => {
        try {
          await request(`/playgrounds/${ground._id}`, { method: "DELETE", token });
          showNotice("Playground deleted.");
          reload();
        } catch (err) {
          showNotice(err.message, "error");
        }
      }
    });
  };

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>My playgrounds</h2>
          <p>Manage your registered venues, update details, pricing and photos.</p>
        </div>
        <button className="button" onClick={() => setActiveModal("add-playground")}>+ Add playground</button>
      </div>

      <div className="pinned-grid">
        {playgrounds.length ? (
          playgrounds.map((ground) => (
            <article key={ground._id} className="card">
              <span className={`status ${ground.isApproved ? "confirmed" : "pending"}`}>
                {ground.status || "Active"} · {ground.isApproved ? "Approved" : "Pending approval"}
              </span>
              <h3>{ground.name}</h3>
              <p>
                {ground.sportType} · {ground.address || `${ground.area}, ${ground.district}`}<br />
                Morning ৳{ground.pricing?.morning ?? "—"}, Evening ৳{ground.pricing?.evening ?? "—"}
              </p>
              <div className="card-foot">
                <button type="button" className="button" onClick={() => { setActiveModal("edit-playground"); setModalData(ground); }}>
                  Edit details
                </button>
                <button type="button" className="button alt" onClick={() => handleDeleteGround(ground)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">You have not registered any playgrounds yet. Click &ldquo;+ Add playground&rdquo; above.</div>
        )}
      </div>
    </div>
  );
}

// ===================================================
// SECTION 4: SUPER ADMIN PLAYGROUND GOVERNANCE
// ===================================================
function SuperAdminPlaygroundsTab({ playgrounds, token, showNotice, reload, setActiveModal, setModalData, setConfirmDialog }) {
  const pending = playgrounds.filter((g) => !g.isApproved).length;
  const active = playgrounds.filter((g) => g.isApproved && g.status === "Active").length;
  const inactive = playgrounds.filter((g) => g.isApproved && g.status !== "Active").length;

  const initials = (name) => String(name || "V").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  const handleAction = async (id, action) => {
    try {
      await request(`/playgrounds/${id}/${action}`, { method: "PATCH", token });
      showNotice(`Playground ${action}d.`);
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <section className="super-venue-workspace">
      <header className="super-venue-hero">
        <div>
          <span className="eyebrow">VENUE GOVERNANCE</span>
          <h2>Playground approval centre</h2>
          <p>Review venue information, approve new listings and control public availability.</p>
        </div>
        <div className="super-venue-stats">
          <article><strong>{pending}</strong><span>Pending review</span></article>
          <article><strong>{active}</strong><span>Live venues</span></article>
          <article><strong>{inactive}</strong><span>Inactive venues</span></article>
        </div>
      </header>

      <section className="pinned-grid">
        {playgrounds.length ? (
          playgrounds.map((ground) => {
            const approved = Boolean(ground.isApproved);
            const live = approved && ground.status === "Active";
            const owner = ground.playgroundAdmin?.name || "Venue owner";
            const location = [ground.area, ground.district].filter(Boolean).join(", ") || ground.address || "Address pending";
            return (
              <article key={ground._id} className="card">
                <span className={`status ${!approved ? "pending" : live ? "confirmed" : "cancelled"}`}>
                  {!approved ? "Pending review" : live ? "Approved · Live" : "Approved · Inactive"}
                </span>
                <h3>{ground.name}</h3>
                <p>
                  <strong>Owner:</strong> {owner} ({initials(owner)})<br />
                  <strong>Location:</strong> {location}<br />
                  <strong>Sport:</strong> {ground.sportType || "Sports"} · <strong>Capacity:</strong> {ground.maxPlayers} players
                </p>
                <div className="card-foot">
                  <button type="button" className="button alt" onClick={() => { setActiveModal("view-ground"); setModalData(ground); }}>
                    View details
                  </button>
                  {!approved && (
                    <button type="button" className="button" onClick={() => handleAction(ground._id, "approve")}>
                      Approve venue
                    </button>
                  )}
                  <button
                    type="button"
                    className="button alt"
                    onClick={() => handleAction(ground._id, live ? "deactivate" : "activate")}
                  >
                    {live ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state">No playgrounds waiting for review.</div>
        )}
      </section>
    </section>
  );
}

// ===================================================
// SECTION 5: SLOTS MANAGEMENT (PLAYGROUND ADMIN)
// ===================================================
function SlotsManagementTab({
  playgrounds, slotsList, slotDate, setSlotDate, token, showNotice, reload, setActiveModal, setModalData, setConfirmDialog
}) {
  const [subTab, setSubTab] = useState("daily");
  const selectedDate = new Date(slotDate + "T12:00:00");
  const dayOfWeek = selectedDate.getDay();

  const handleToggleSlotDate = (slotId, available) => {
    setConfirmDialog({
      title: available ? "Make this slot available?" : "Block this slot for one day?",
      message: available
        ? `Customers will be able to book this slot on ${slotDate}.`
        : `Customers will not be able to book this slot on ${slotDate}. The weekly schedule will stay unchanged.`,
      confirmLabel: available ? "Make available" : "Block this date",
      danger: !available,
      onConfirm: async () => {
        try {
          await request(`/slots/${slotId}/date-availability`, {
            method: "PATCH",
            body: { date: slotDate, available },
            token
          });
          showNotice(available ? "Slot is available again for this date." : "Slot blocked for this date.");
          reload();
        } catch (err) {
          showNotice(err.message, "error");
        }
      }
    });
  };

  const handleRemoveSlot = (slotId) => {
    setConfirmDialog({
      title: "Remove this slot?",
      message: "Customers will no longer be able to book this scheduled recurring time.",
      confirmLabel: "Remove slot",
      danger: true,
      onConfirm: async () => {
        try {
          await request(`/slots/${slotId}`, { method: "DELETE", token });
          showNotice("Slot removed.");
          reload();
        } catch (err) {
          showNotice(err.message, "error");
        }
      }
    });
  };

  return (
    <div>
      <div className="management-toolbar daily-schedule-toolbar">
        <div>
          <h2>Slot schedules & daily availability</h2>
          <p>Organise availability separately for every playground or block dates.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {subTab === "daily" && (
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.84rem", fontWeight: 700 }}>
              Schedule date
              <input type="date" value={slotDate} min={isoDate()} onChange={(e) => setSlotDate(e.target.value)} />
            </label>
          )}
          <button className="button" onClick={() => setActiveModal("add-slots")}>+ Generate slots</button>
        </div>
      </div>

      <div className="nav-subtabs">
        <button className={subTab === "daily" ? "active" : ""} onClick={() => setSubTab("daily")}>Daily slot availability</button>
        <button className={subTab === "weekly" ? "active" : ""} onClick={() => setSubTab("weekly")}>Weekly schedules by venue</button>
      </div>

      {subTab === "daily" ? (
        slotsList.length ? (
          slotsList.map(({ ground, slots, bookings }) => {
            const venueSlots = slots.filter((s) => s.dayOfWeek === dayOfWeek && s.isActive);
            const bookingsForDay = bookings.filter((b) => String(b.bookingDate).slice(0, 10) === slotDate && ["Pending", "Confirmed"].includes(b.bookingStatus));

            return (
              <section key={ground._id} className="daily-venue">
                <header>
                  <div>
                    <span className="venue-kicker">PLAYGROUND</span>
                    <h2>{ground.name}</h2>
                    <p>{ground.address || "Address pending"}</p>
                  </div>
                  <strong>{bookingsForDay.length} booked</strong>
                </header>

                <div className="daily-slot-grid">
                  {venueSlots.length ? (
                    venueSlots.map((slot) => {
                      const booking = bookingsForDay.find((b) => b.startTime === slot.startTime && b.endTime === slot.endTime);
                      const unavailable = (slot.unavailableDates || []).includes(slotDate);

                      if (booking) {
                        return (
                          <article key={slot._id} className="daily-slot booked">
                            <div>
                              <span>BOOKED</span>
                              <strong>{slot.startTime} – {slot.endTime}</strong>
                              <small>{booking.customer?.name || "Customer"} · {booking.bookingStatus}</small>
                            </div>
                            <b>Reserved</b>
                          </article>
                        );
                      }
                      if (unavailable) {
                        return (
                          <article key={slot._id} className="daily-slot unavailable">
                            <div>
                              <span>UNAVAILABLE</span>
                              <strong>{slot.startTime} – {slot.endTime}</strong>
                              <small>Closed only for this date</small>
                            </div>
                            <button className="button alt" type="button" onClick={() => handleToggleSlotDate(slot._id, true)}>
                              Make available
                            </button>
                          </article>
                        );
                      }
                      return (
                        <article key={slot._id} className="daily-slot available">
                          <div>
                            <span>AVAILABLE</span>
                            <strong>{slot.startTime} – {slot.endTime}</strong>
                            <small>{slot.price ? `৳${slot.price}` : "Open for booking"}</small>
                          </div>
                          <button className="button alt" type="button" onClick={() => handleToggleSlotDate(slot._id, false)}>
                            Block this date
                          </button>
                        </article>
                      );
                    })
                  ) : (
                    <p className="item-meta">No active slots are scheduled for this day.</p>
                  )}
                </div>
              </section>
            );
          })
        ) : (
          <div className="empty-state">No playgrounds configured yet.</div>
        )
      ) : (
        slotsList.length ? (
          slotsList.map(({ ground, slots }) => (
            <section key={ground._id} className="venue-slot-group">
              <header>
                <div>
                  <span>PLAYGROUND</span>
                  <h2>{ground.name}</h2>
                  <p>{ground.address || "Address pending"}</p>
                </div>
                <strong>{slots.filter((s) => s.isActive).length} active slots</strong>
              </header>
              <div className="venue-slot-list">
                {slots.length ? (
                  slots.map((slot) => (
                    <article key={slot._id} className="slot-record">
                      <div>
                        <span className={`status ${slot.isActive ? "confirmed" : "pending"}`}>{slot.isActive ? "Active" : "Inactive"}</span>
                        <strong>Day {slot.dayOfWeek} · {slot.startTime} – {slot.endTime}</strong>
                      </div>
                      <button className="button alt" type="button" onClick={() => handleRemoveSlot(slot._id)}>Remove</button>
                    </article>
                  ))
                ) : (
                  <p className="item-meta">No slots configured for this playground.</p>
                )}
              </div>
            </section>
          ))
        ) : (
          <div className="empty-state">Add a playground before creating its slots.</div>
        )
      )}
    </div>
  );
}

// ===================================================
// SECTION 6: ADMIN BOOKINGS
// ===================================================
function AdminBookingsTab({ bookings, token, showNotice, reload, setActiveModal, setModalData }) {
  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Booking history & operations</h2>
          <p>Review customer reservations and manage refunds or cancellations.</p>
        </div>
      </div>

      <div className="pinned-grid">
        {bookings.length ? (
          bookings.map((b) => {
            const canCancel = ["Pending", "Confirmed"].includes(b.bookingStatus);
            return (
              <article key={b._id} className="card">
                <span className={`status ${b.bookingStatus?.toLowerCase()}`}>
                  {b.bookingStatus} · {b.paymentStatus || "Unpaid"}
                </span>
                <h3>{b.playground?.name || "Playground booking"}</h3>
                <p>
                  {b.customer?.name || "Customer"} · {prettyDate(b.bookingDate)}<br />
                  {b.startTime} – {b.endTime}<br />
                  <strong>Paid:</strong> ৳{new Intl.NumberFormat("en-BD").format(b.totalAmount || b.pricing || 0)}
                  {b.cancellationReason && (
                    <><br /><strong style={{ color: "#a53636" }}>Reason:</strong> {b.cancellationReason}</>
                  )}
                </p>
                {canCancel && (
                  <div className="card-foot">
                    <button
                      className="button alt"
                      type="button"
                      onClick={() => { setActiveModal("admin-cancel"); setModalData(b); }}
                    >
                      Cancel booking
                    </button>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="empty-state">No playground bookings yet.</div>
        )}
      </div>
    </div>
  );
}

// ===================================================
// SECTION 7: STAFF MANAGEMENT (PLAYGROUND ADMIN)
// ===================================================
function StaffManagementTab({ staffList = [], playgrounds = [], token, showNotice, reload, setActiveModal, setConfirmDialog }) {
  const handleDeleteStaff = (staff) => {
    setConfirmDialog({
      title: `Remove ${staff.name}?`,
      message: `Are you sure you want to remove ${staff.name} from your venue staff? Their gate scanner access will be revoked immediately.`,
      danger: true,
      confirmLabel: "Remove staff",
      onConfirm: async () => {
        try {
          await request(`/users/staff/${staff._id}`, { method: "DELETE", token });
          showNotice(`Staff account ${staff.name} removed successfully.`);
          reload();
        } catch (err) {
          showNotice(err.message, "error");
        }
      }
    });
  };

  const uniqueGrounds = new Set(staffList.map((s) => s.assignedPlayground?._id || s.assignedPlayground).filter(Boolean));

  return (
    <div className="staff-mgmt-page">
      {/* Top Metric Stat Cards */}
      <div className="staff-stats-row">
        <div className="staff-stat-box">
          <div className="stat-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <span className="stat-label">Active Field Staff</span>
            <strong className="stat-value">{staffList.length} {staffList.length === 1 ? "Employee" : "Employees"}</strong>
          </div>
        </div>

        <div className="staff-stat-box">
          <div className="stat-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <span className="stat-label">Assigned Venue Gates</span>
            <strong className="stat-value">{uniqueGrounds.size || (staffList.length ? 1 : 0)} of {playgrounds.length} Grounds</strong>
          </div>
        </div>

        <div className="staff-stat-box">
          <div className="stat-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <span className="stat-label">Role Access Level</span>
            <strong className="stat-value">Gate QR Scanner &amp; Check-in</strong>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="staff-action-head">
        <div>
          <h2>Employee &amp; Gate Staff Management</h2>
          <p>Create dedicated employee accounts to scan customer QR passes and verify venue entry.</p>
        </div>
        <button
          type="button"
          className="add-staff-btn"
          onClick={() => setActiveModal("add-staff")}
          disabled={!playgrounds.length}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add New Employee</span>
        </button>
      </div>

      {!playgrounds.length ? (
        <div className="staff-empty-card">
          <div className="empty-icon-circle">🏟️</div>
          <h3>No playgrounds registered yet</h3>
          <p>You need to register at least one approved playground before creating employee gate accounts.</p>
        </div>
      ) : staffList.length ? (
        <div className="staff-grid-modern">
          {staffList.map((s) => {
            const initials = (s.name || "S").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <article key={s._id} className="staff-card-modern">
                {/* Card Header */}
                <div className="staff-card-head">
                  <div className="staff-avatar-wrap">
                    <span className="staff-initials">{initials}</span>
                  </div>
                  <div className="staff-meta-col">
                    <div className="staff-name-row">
                      <h3>{s.name}</h3>
                      <span className="verified-check" title="Active Employee Account">✓</span>
                    </div>
                    <span className="staff-designation">{s.staffTitle || "Gatekeeper / Entry Staff"}</span>
                  </div>
                  <span className="live-status-pill">
                    <span className="live-dot" />
                    Active
                  </span>
                </div>

                {/* Venue Badge Box */}
                <div className="staff-venue-box">
                  <div className="venue-label-row">
                    <span className="venue-lead-label">ASSIGNED VENUE GATE</span>
                    <span className="venue-tag">Gate Pass Check</span>
                  </div>
                  <strong className="venue-title">🏟️ {s.assignedPlayground?.name || "Assigned Turf"}</strong>
                  <p className="venue-address">
                    {s.assignedPlayground?.address || `${s.assignedPlayground?.area || s.assignedPlayground?.district || "Dhaka"}, Bangladesh`}
                  </p>
                </div>

                {/* Contact List */}
                <div className="staff-details-list">
                  <div className="staff-detail-item">
                    <span className="detail-icon">✉️</span>
                    <div>
                      <small>LOGIN EMAIL</small>
                      <strong>{s.email}</strong>
                    </div>
                  </div>
                  <div className="staff-detail-item">
                    <span className="detail-icon">📞</span>
                    <div>
                      <small>CONTACT PHONE</small>
                      <strong>{s.phone || "Not provided"}</strong>
                    </div>
                  </div>
                  <div className="staff-detail-item">
                    <span className="detail-icon">📅</span>
                    <div>
                      <small>JOINED DATE</small>
                      <strong>{prettyDate(s.createdAt)}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="staff-card-footer">
                  <span className="access-perm-badge">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    QR Scanner Enabled
                  </span>
                  <button
                    type="button"
                    className="remove-staff-btn"
                    onClick={() => handleDeleteStaff(s)}
                  >
                    Remove Access
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="staff-empty-card">
          <div className="empty-icon-circle">👥</div>
          <h3>No employee accounts created yet</h3>
          <p>Add venue staff accounts so your gatekeeper or attendant can scan customer QR tickets directly from their phones or tablets.</p>
          <button
            type="button"
            className="add-staff-btn"
            style={{ marginTop: "16px" }}
            onClick={() => setActiveModal("add-staff")}
          >
            + Create your first employee account
          </button>
        </div>
      )}
    </div>
  );
}

// ===================================================
// SECTION 8: QR SCANNER (PLAYGROUND ADMIN & STAFF)
// ===================================================
function QRScannerTab({ token, showNotice, user, bookings = [], reload }) {
  const [ticketInput, setTicketInput] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [result, setResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  const handleValidate = async (e, directCode) => {
    e?.preventDefault();
    const val = (directCode || ticketInput).trim();
    if (!val) return;
    setValidating(true);
    setResult(null);
    try {
      const res = await request("/payments/validate-qr", {
        method: "POST",
        body: { qrData: val },
        token
      });
      playBeep(true);
      const scanItem = {
        id: Date.now(),
        code: val,
        time: new Date().toLocaleTimeString(),
        booking: res.booking,
        message: res.message || "Valid ticket! Entry granted.",
        verifiedBy: res.verifiedByStaff?.name || user?.name
      };
      setResult({ success: true, message: res.message || "Valid ticket! Entry granted.", data: res });
      setRecentScans((prev) => [scanItem, ...prev.slice(0, 9)]);
      showNotice("Ticket validated: Access granted.");
      if (reload) reload();
    } catch (err) {
      playBeep(false);
      setResult({ success: false, message: err.message || "This QR code is invalid or has expired." });
      showNotice(err.message, "error");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="scanner-page">
      <header className="scanner-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p className="eyebrow">{user?.role === "staff" ? "GATE SECURITY CHECKPOINT" : "VENUE OPERATIONS"}</p>
            <h1>{user?.role === "staff" ? "Gatekeeper QR Scanner" : "Venue Check-in Scanner"}</h1>
            <p>Scan ticket QR code or manually paste ticket ID to verify ground entry.</p>
          </div>
          {user?.role === "staff" && (
            <div style={{ background: "#e8f5ed", border: "1px solid #b7dfc6", borderRadius: "10px", padding: "8px 16px", fontSize: "0.85rem", color: "#163a23" }}>
              <strong>Staff:</strong> {user?.name} · <strong>Gate:</strong> {user?.assignedPlayground?.name || "Assigned Turf"}
            </div>
          )}
        </div>
      </header>

      <div className="scanner-layout">
        {/* Scanner Card */}
        <section className="scanner-card">
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div
              style={{
                width: "100%",
                height: "220px",
                background: "#0c2816",
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                color: "#79e29a",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {cameraOn ? (
                <>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "#22c55e", boxShadow: "0 0 12px #22c55e", animation: "turf-scan-laser 2s infinite alternate" }} />
                  <div>
                    <span style={{ fontSize: "2rem" }}>📷</span>
                    <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "#bbf7d0" }}>Camera active — point at customer QR pass</p>
                  </div>
                </>
              ) : (
                <div>
                  <span style={{ fontSize: "2rem", opacity: 0.6 }}>⌕</span>
                  <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "#86efac" }}>Camera is in standby</p>
                </div>
              )}
            </div>
            <div style={{ marginTop: "14px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                className={`button ${cameraOn ? "alt" : ""}`}
                onClick={() => setCameraOn(!cameraOn)}
              >
                {cameraOn ? "Stop camera" : "Start QR camera"}
              </button>
            </div>
          </div>

          <form onSubmit={handleValidate} className="form-grid" style={{ marginTop: "20px" }}>
            <label className="full">
              Manual Ticket ID / QR Payload
              <input
                type="text"
                placeholder="Enter booking ID or QR ticket string..."
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
              />
            </label>
            <div className="full">
              <button className="button" type="submit" disabled={validating} style={{ width: "100%" }}>
                {validating ? "Validating ticket…" : "Verify QR ticket"}
              </button>
            </div>
          </form>
        </section>

        {/* Result Card */}
        <section className="result-card">
          <h3>Validation Result</h3>
          {result ? (
            <div style={{ marginTop: "14px" }}>
              <span className={`status ${result.success ? "confirmed" : "cancelled"}`}>
                {result.success ? "ACCESS GRANTED" : "INVALID PASS"}
              </span>
              <p style={{ margin: "12px 0 6px", fontSize: "0.92rem", fontWeight: 700, color: result.success ? "#0d7135" : "#a53636" }}>
                {result.message}
              </p>
              {result.data?.booking && (
                <div style={{ fontSize: "0.82rem", color: "#546258", borderTop: "1px solid #edf2ee", paddingTop: "10px", marginTop: "10px" }}>
                  <strong>Customer:</strong> {result.data.booking.customer?.name || "Customer"}<br />
                  <strong>Playground:</strong> {result.data.booking.playground?.name || "Venue"}<br />
                  <strong>Time slot:</strong> {result.data.booking.startTime} – {result.data.booking.endTime}<br />
                  {result.data.verifiedByStaff && (
                    <small style={{ color: "#15803d" }}>Verified by: {result.data.verifiedByStaff.name}</small>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="item-meta" style={{ marginTop: "14px" }}>
              Scan a pass or enter ticket code to see customer verification details here.
            </p>
          )}

          {/* Recent Scans Session Log */}
          {recentScans.length > 0 && (
            <div style={{ marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <h4 style={{ fontSize: "0.85rem", color: "#334155", margin: "0 0 10px" }}>Recent Check-ins (This Session)</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recentScans.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "6px 10px", borderRadius: "6px", fontSize: "0.78rem" }}>
                    <div>
                      <strong>{s.booking?.customer?.name || "Customer"}</strong> · #{String(s.code).slice(-6)}
                    </div>
                    <span style={{ color: "#16a34a", fontWeight: 600 }}>{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ===================================================
// SECTION 9: GATE CHECK-INS (STAFF)
// ===================================================
function GateCheckinsTab({ bookings = [], user, token, showNotice, reload }) {
  const [filter, setFilter] = useState("all");
  const [checkingIn, setCheckingIn] = useState(null);

  const handleQuickCheckin = async (b) => {
    setCheckingIn(b._id);
    try {
      await request("/payments/validate-qr", {
        method: "POST",
        body: { qrData: b._id },
        token
      });
      playBeep(true);
      showNotice(`Check-in verified for ${b.customer?.name || "Customer"}! Entry granted.`);
      if (reload) reload();
    } catch (err) {
      playBeep(false);
      showNotice(err.message, "error");
    } finally {
      setCheckingIn(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const isPaid = b.paymentStatus === "Paid" || b.status === "paid" || b.bookingStatus === "Confirmed";
    if (filter === "checked-in") return b.checkedIn || b.bookingStatus === "Completed";
    if (filter === "awaiting") return !b.checkedIn && isPaid;
    return true;
  });

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Gate Check-in Register</h2>
          <p>Live manifest of customer bookings and passes for {user?.assignedPlayground?.name || "your venue"}.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["all", "awaiting", "checked-in"].map((f) => (
            <button
              key={f}
              type="button"
              className={`button ${filter === f ? "" : "alt"}`}
              style={{ fontSize: "0.82rem", padding: "6px 14px" }}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All Bookings" : f === "awaiting" ? "Awaiting Arrival" : "Checked In"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="pinned-grid">
          {filtered.map((b) => {
            const isCheckedIn = Boolean(b.checkedIn || b.bookingStatus === "Completed");
            return (
              <article key={b._id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className={`status ${isCheckedIn ? "confirmed" : "pending"}`}>
                    {isCheckedIn ? "Checked In ✓" : "Awaiting Check-in"}
                  </span>
                  <strong style={{ fontSize: "0.82rem", color: "#15803d" }}>
                    ৳{new Intl.NumberFormat("en-BD").format(b.totalAmount || b.pricing || 0)}
                  </strong>
                </div>
                <h3 style={{ margin: "8px 0 4px" }}>{b.customer?.name || "Customer Ticket"}</h3>
                <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
                  <strong>Time Slot:</strong> {b.startTime} – {b.endTime}<br />
                  <strong>Date:</strong> {prettyDate(b.bookingDate)}<br />
                  <strong>Pass ID:</strong> #{String(b._id).slice(-8).toUpperCase()}<br />
                  {b.customer?.phone && <><strong>Phone:</strong> {b.customer.phone}<br /></>}
                  {b.checkedInAt && <small style={{ color: "#16a34a" }}>Scanned at: {new Date(b.checkedInAt).toLocaleTimeString()}</small>}
                </p>
                <div className="card-foot" style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                  {isCheckedIn ? (
                    <span style={{ fontSize: "0.82rem", color: "#166534", fontWeight: 700 }}>
                      ✓ Verified &amp; Entry Allowed
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="button"
                      style={{ width: "100%", fontSize: "0.82rem", padding: "8px 12px" }}
                      disabled={checkingIn === b._id}
                      onClick={() => handleQuickCheckin(b)}
                    >
                      {checkingIn === b._id ? "Verifying…" : "Verify & Check In"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No bookings match this filter</h3>
          <p>Customer reservations for this playground will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}

// ===================================================
// SECTION 8: INCOME & OFFICE REFUND DESK
// ===================================================
function IncomeTab({ incomeData, token, showNotice, reload, setConfirmDialog }) {
  const handleMarkRefund = (paymentId) => {
    setConfirmDialog({
      title: "Confirm refund collection?",
      message: "Mark this refund as successfully paid to the customer in cash at the venue office? An in-app notification will be sent immediately.",
      confirmLabel: "Confirm refund",
      onConfirm: async () => {
        try {
          await request(`/payments/refund/${paymentId}/complete`, { method: "PATCH", token });
          showNotice("Refund completed successfully.");
          reload();
        } catch (err) {
          showNotice(err.message, "error");
        }
      }
    });
  };

  const formatBD = (v) => `৳${new Intl.NumberFormat("en-BD").format(v || 0)}`;

  return (
    <div className="income-dashboard" style={{ marginTop: 0 }}>
      <header className="section-heading">
        <div>
          <h2>Income overview</h2>
          <p>Paid earnings from your own playgrounds.</p>
        </div>
      </header>

      <section className="income-summary">
        <article>
          <span>Slot income</span>
          <strong>{formatBD(incomeData?.slotTotal)}</strong>
        </article>
        <article>
          <span>Tournament income</span>
          <strong>{formatBD(incomeData?.tournamentTotal)}</strong>
        </article>
        <article className="income-total">
          <span>Total income</span>
          <strong>{formatBD(incomeData?.total)}</strong>
        </article>
      </section>

      {/* Refund Collection Desk */}
      <section className="income-section" style={{ marginTop: "20px" }}>
        <h2>Refund collection desk</h2>
        <p className="item-meta" style={{ marginBottom: "14px" }}>
          Confirm only after the customer has received the cash at the venue office. A “Refund successful” notification appears immediately.
        </p>
        <div>
          {incomeData?.pendingRefunds?.length ? (
            incomeData.pendingRefunds.map((ref) => (
              <article key={ref.paymentId} className="income-row">
                <div>
                  <span>OFFICE REFUND · PENDING</span>
                  <strong>{ref.customer} · {formatBD(ref.amount)}</strong>
                  <small>{ref.playground} · {ref.reference}</small>
                </div>
                <button className="button" type="button" onClick={() => handleMarkRefund(ref.paymentId)}>
                  Mark refund successful
                </button>
              </article>
            ))
          ) : (
            <p className="item-meta">No refunds are waiting for office collection.</p>
          )}
        </div>
      </section>

      {/* Paid Transactions Split Grid */}
      <section className="split-grid" style={{ marginTop: "20px" }}>
        <article className="panel income-panel slot-income-panel">
          <h2 className="panel-title">
            <span className="income-icon slot-icon">◷</span>
            <span>Slot booking income</span>
            <small>Paid reservations</small>
          </h2>
          <div>
            {incomeData?.slots?.length ? (
              incomeData.slots.map((item, idx) => (
                <div key={idx} className="list-row">
                  <div>
                    <div className="item-title">{item.playground}</div>
                    <p className="item-meta">{prettyDate(item.date)} · {item.startTime}–{item.endTime}</p>
                  </div>
                  <span className="status">{formatBD(item.amount)}</span>
                </div>
              ))
            ) : (
              <p className="item-meta" style={{ padding: "16px 20px" }}>No paid slot bookings yet.</p>
            )}
          </div>
        </article>

        <article className="panel income-panel tournament-income-panel">
          <h2 className="panel-title">
            <span className="income-icon tournament-icon">★</span>
            <span>Tournament income</span>
            <small>Registration fees</small>
          </h2>
          <div>
            {incomeData?.tournaments?.length ? (
              incomeData.tournaments.map((item, idx) => (
                <div key={idx} className="list-row">
                  <div>
                    <div className="item-title">{item.tournament}</div>
                    <p className="item-meta">{item.team} · {item.playground}</p>
                  </div>
                  <span className="status">{formatBD(item.amount)}</span>
                </div>
              ))
            ) : (
              <p className="item-meta" style={{ padding: "16px 20px" }}>No paid tournament registrations yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

// ===================================================
// SECTION 9: USER CONTROL (SUPER ADMIN)
// ===================================================
function UserControlTab({ users, token, showNotice, reload, setConfirmDialog }) {
  const [filterRole, setFilterRole] = useState("All");

  const handleBlockToggle = (u) => {
    const isBlocked = Boolean(u.isBlocked);
    setConfirmDialog({
      title: isBlocked ? `Unblock ${u.name}?` : `Block ${u.name}?`,
      message: isBlocked ? "User will be able to log in and make bookings again." : "User will be restricted from accessing the platform.",
      confirmLabel: isBlocked ? "Unblock account" : "Block account",
      danger: !isBlocked,
      onConfirm: async () => {
        try {
          await request(`/users/${isBlocked ? "unblock" : "block"}/${u._id}`, {
            method: "PATCH",
            body: {},
            token
          });
          showNotice(isBlocked ? "User unblocked." : "User blocked.");
          reload();
        } catch (err) {
          showNotice(err.message, "error");
        }
      }
    });
  };

  const filtered = filterRole === "All" ? users : users.filter((u) => u.role === filterRole);

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Platform user control</h2>
          <p>Oversee registered customer accounts, owners, and system administrators.</p>
        </div>
      </div>

      <div className="nav-subtabs">
        {["All", "customer", "playground-admin", "super-admin"].map((r) => (
          <button key={r} className={filterRole === r ? "active" : ""} onClick={() => setFilterRole(r)}>
            {r === "All" ? "All users" : r.replace("-", " ")}
          </button>
        ))}
      </div>

      <div className="pinned-grid">
        {filtered.map((u) => (
          <article key={u._id} className="card">
            <span className={`status ${u.isBlocked ? "cancelled" : "confirmed"}`}>
              {u.role} · {u.isBlocked ? "Blocked" : "Active"}
            </span>
            <h3>{u.name}</h3>
            <p>
              {u.email}<br />
              {u.phone || "No phone added"}<br />
              <small>Joined: {prettyDate(u.createdAt)}</small>
            </p>
            {u.role !== "super-admin" && (
              <div className="card-foot">
                <button
                  type="button"
                  className={`button ${u.isBlocked ? "" : "alt"}`}
                  onClick={() => handleBlockToggle(u)}
                >
                  {u.isBlocked ? "Unblock user" : "Block user"}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

// ===================================================
// SECTION 10: REPORTS (Role-Adaptive)
// ===================================================
function ReportsTab({ role, myReports, allReports, playgrounds, reportableCustomers, token, showNotice, reload }) {
  const superAdmin = role === "super-admin";
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [decisionNotes, setDecisionNotes] = useState({});
  const [decisionStatuses, setDecisionStatuses] = useState({});

  const [newReport, setNewReport] = useState({
    playground: "", customerRecord: "", category: "Safety", severity: "Medium", subject: "", message: ""
  });

  const handleCreateReport = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        targetType: role === "playground-admin" ? "User" : "Playground",
        category: newReport.category,
        severity: newReport.severity,
        subject: newReport.subject,
        message: newReport.message
      };
      if (role === "playground-admin") {
        const [repUser, pg] = newReport.customerRecord.split("|");
        payload.reportedUser = repUser;
        payload.playground = pg;
      } else {
        payload.playground = newReport.playground;
      }
      await request("/reports", { method: "POST", body: payload, token });
      showNotice("Report submitted successfully for admin review.");
      setNewReport({ playground: "", customerRecord: "", category: "Safety", severity: "Medium", subject: "", message: "" });
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleSaveDecision = async (reportId) => {
    const status = decisionStatuses[reportId] || "Resolved";
    const adminNote = decisionNotes[reportId] || "";
    try {
      await request(`/reports/${reportId}/status`, {
        method: "PATCH",
        body: { status, adminNote },
        token
      });
      showNotice("Decision saved. Reporter has been notified.");
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  if (superAdmin) {
    const filteredReports = allReports.filter((r) => {
      const matchSearch = [r.subject, r.message, r.reporter?.name, r.playground?.name, r.reportedUser?.name]
        .filter(Boolean).join(" ").toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });

    const openCount = allReports.filter((r) => ["Pending", "Under Review"].includes(r.status)).length;
    const resolvedCount = allReports.filter((r) => r.status === "Resolved").length;

    return (
      <section className="report-workspace">
        <header className="report-hero">
          <div>
            <h2>Report review queue</h2>
            <p>Prioritise incoming issues, document decisions and keep reporters informed.</p>
          </div>
          <div className="report-stats">
            <div className="report-stat"><strong>{allReports.length}</strong><span>Total reports</span></div>
            <div className="report-stat"><strong>{openCount}</strong><span>Open</span></div>
            <div className="report-stat"><strong>{resolvedCount}</strong><span>Resolved</span></div>
          </div>
        </header>

        <article className="report-list-panel">
          <header className="report-panel-head">
            <div>
              <h3>All reports</h3>
              <span>Filter queue, then save a status and review note.</span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="search"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #d9e9de" }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #d9e9de" }}
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under review</option>
                <option value="Resolved">Resolved</option>
                <option value="Dismissed">Dismissed</option>
              </select>
            </div>
          </header>

          <div style={{ padding: "18px" }}>
            {filteredReports.length ? (
              filteredReports.map((r) => {
                const target = r.targetType === "User" ? (r.reportedUser?.name || "Customer account") : (r.playground?.name || "Account issue");
                return (
                  <article key={r._id} className="report-card">
                    <div className="report-card-top">
                      <span className={`report-status ${r.status?.toLowerCase().replace(/\s+/g, "-")}`}>{r.status}</span>
                      <span className={`report-severity ${r.severity?.toLowerCase()}`}>{r.severity} priority</span>
                    </div>
                    <h3>{r.subject}</h3>
                    <p>{r.message}</p>
                    <div className="report-meta">
                      <span>Category: {r.category}</span>
                      <span>From: {r.reporter?.name || "User"}</span>
                      <span>Regarding: {target}</span>
                      <span>Submitted: {prettyDate(r.createdAt)}</span>
                    </div>
                    {r.adminNote && (
                      <div className="report-review">
                        <div className="report-review-head"><strong>Admin update</strong><span>{prettyDate(r.reviewedAt)}</span></div>
                        <p>{r.adminNote}</p>
                      </div>
                    )}
                    <div style={{ marginTop: "14px", borderTop: "1px solid #edf2ee", paddingTop: "12px", display: "grid", gap: "8px" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700 }}>Review decision</label>
                      <select
                        value={decisionStatuses[r._id] || r.status}
                        onChange={(e) => setDecisionStatuses({ ...decisionStatuses, [r._id]: e.target.value })}
                        style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #d9e9de" }}
                      >
                        <option value="Pending">Pending — not started</option>
                        <option value="Under Review">Under review — investigating</option>
                        <option value="Resolved">Resolved — action completed</option>
                        <option value="Dismissed">Dismissed — no action needed</option>
                      </select>
                      <textarea
                        placeholder="Message for reporter (explaining decision)..."
                        defaultValue={r.adminNote || ""}
                        onChange={(e) => setDecisionNotes({ ...decisionNotes, [r._id]: e.target.value })}
                        style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #d9e9de", minHeight: "60px" }}
                      />
                      <button className="button" type="button" onClick={() => handleSaveDecision(r._id)}>
                        Save decision & notify
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="item-meta">No reports match these filters.</p>
            )}
          </div>
        </article>
      </section>
    );
  }

  // Customer or Playground Admin Report View
  const openCount = myReports.filter((r) => ["Pending", "Under Review"].includes(r.status)).length;
  const resolvedCount = myReports.filter((r) => r.status === "Resolved").length;

  return (
    <section className="report-workspace">
      <header className="report-hero">
        <div>
          <h2>{role === "playground-admin" ? "Customer report centre" : "Report centre"}</h2>
          <p>{role === "playground-admin" ? "Report behaviour or booking issues only for customers of your own playgrounds." : "Send a detailed issue report and follow its review status from one place."}</p>
        </div>
        <div className="report-stats">
          <div className="report-stat"><strong>{myReports.length}</strong><span>Total reports</span></div>
          <div className="report-stat"><strong>{openCount}</strong><span>Open</span></div>
          <div className="report-stat"><strong>{resolvedCount}</strong><span>Resolved</span></div>
        </div>
      </header>

      <div className="report-layout">
        {/* Report Form */}
        <article className="report-form-panel">
          <h3>{role === "playground-admin" ? "Report a customer" : "Submit an issue"}</h3>
          <p className="report-detail">{role === "playground-admin" ? "The customer and playground are verified before submission." : "Clear details help resolve your issue faster."}</p>

          <form onSubmit={handleCreateReport} className="form-grid report-form" style={{ marginTop: "14px" }}>
            {role === "playground-admin" ? (
              <label className="full">
                Choose booked customer
                <select
                  required
                  value={newReport.customerRecord}
                  onChange={(e) => setNewReport({ ...newReport, customerRecord: e.target.value })}
                >
                  <option value="">Choose one of your booked customers</option>
                  {reportableCustomers.map((c) => (
                    <option key={`${c.customer._id}|${c.playground._id}`} value={`${c.customer._id}|${c.playground._id}`}>
                      {c.customer.name} — {c.playground.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="full">
                Choose playground
                <select
                  required
                  value={newReport.playground}
                  onChange={(e) => setNewReport({ ...newReport, playground: e.target.value })}
                >
                  <option value="">Choose a playground</option>
                  {playgrounds.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Category
              <select value={newReport.category} onChange={(e) => setNewReport({ ...newReport, category: e.target.value })}>
                <option>Cleanliness</option>
                <option>Maintenance</option>
                <option>Staff Behavior</option>
                <option>Facilities</option>
                <option>Safety</option>
                <option>Booking Issue</option>
                <option>Customer Misconduct</option>
                <option>Property Damage</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Severity
              <select value={newReport.severity} onChange={(e) => setNewReport({ ...newReport, severity: e.target.value })}>
                <option value="Low">Low priority</option>
                <option value="Medium">Medium priority</option>
                <option value="High">High priority</option>
                <option value="Critical">Critical / safety</option>
              </select>
            </label>

            <label className="full">
              Short report title
              <input
                required
                value={newReport.subject}
                onChange={(e) => setNewReport({ ...newReport, subject: e.target.value })}
                placeholder="Title..."
              />
            </label>

            <label className="full">
              Details
              <textarea
                required
                value={newReport.message}
                onChange={(e) => setNewReport({ ...newReport, message: e.target.value })}
                placeholder="Describe what happened and include helpful booking details..."
              />
            </label>

            <div className="full">
              <button className="button" type="submit" style={{ width: "100%" }}>
                Submit report
              </button>
            </div>
          </form>
        </article>

        {/* My Reports List */}
        <article className="report-list-panel">
          <header className="report-panel-head">
            <div>
              <h3>My report history</h3>
              <span>Only the super admin can update report statuses.</span>
            </div>
          </header>
          <div style={{ padding: "18px" }}>
            {myReports.length ? (
              myReports.map((r) => {
                const target = r.targetType === "User" ? (r.reportedUser?.name || "Customer") : (r.playground?.name || "Venue issue");
                return (
                  <article key={r._id} className="report-card">
                    <div className="report-card-top">
                      <span className={`report-status ${r.status?.toLowerCase().replace(/\s+/g, "-")}`}>{r.status}</span>
                      <span className={`report-severity ${r.severity?.toLowerCase()}`}>{r.severity}</span>
                    </div>
                    <h3>{r.subject}</h3>
                    <p>{r.message}</p>
                    <div className="report-meta">
                      <span>Category: {r.category}</span>
                      <span>Regarding: {target}</span>
                      <span>{prettyDate(r.createdAt)}</span>
                    </div>
                    {r.adminNote && (
                      <div className="report-review">
                        <div className="report-review-head"><strong>Admin update</strong><span>{prettyDate(r.reviewedAt)}</span></div>
                        <p>{r.adminNote}</p>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="item-meta">No reports submitted yet.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

// ===================================================
// SECTION 11: ACCOUNT CENTRE / PROFILE WORKSPACE
// ===================================================
function AccountCentreTab({ user, setUser, token, showNotice }) {
  const [profileView, setProfileView] = useState("personal");
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    gender: user?.gender || "",
    dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "",
    address: user?.address || ""
  });

  const [pwdState, setPwdState] = useState({ newPassword: "", confirmPassword: "", otp: "" });
  const [pwdOtpSent, setPwdOtpSent] = useState(false);

  const [emailState, setEmailState] = useState({ newEmail: "", otp: "" });
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await request("/users/me", { method: "PUT", body: profileForm, token });
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem("turf_user", JSON.stringify(merged));
      showNotice("Profile saved successfully. Account details are now up to date.");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showNotice("Choose an image under 5 MB.", "error");
    const formData = new FormData();
    formData.append("profileImage", file);
    try {
      const updated = await request("/users/me/profile-image", { method: "PUT", body: formData, token });
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem("turf_user", JSON.stringify(merged));
      showNotice("Profile photo updated.");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleRequestPasswordOtp = async () => {
    try {
      await request("/auth/request-sensitive-otp", { method: "POST", body: { action: "password-change" }, token });
      setPwdOtpSent(true);
      showNotice("OTP sent to your current email address.");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    if (pwdState.newPassword !== pwdState.confirmPassword) return showNotice("Passwords do not match.", "error");
    try {
      await request("/auth/change-password", {
        method: "PATCH",
        body: { newPassword: pwdState.newPassword, otp: pwdState.otp },
        token
      });
      showNotice("Password changed successfully.");
      setPwdState({ newPassword: "", confirmPassword: "", otp: "" });
      setPwdOtpSent(false);
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleRequestEmailOtp = async () => {
    if (!emailState.newEmail) return showNotice("Enter a new email address.", "error");
    try {
      await request("/auth/request-sensitive-otp", {
        method: "POST",
        body: { action: "email-change", newEmail: emailState.newEmail },
        token
      });
      setEmailOtpSent(true);
      showNotice("OTP sent to the new email address.");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    try {
      const updated = await request("/auth/change-email", {
        method: "PATCH",
        body: { newEmail: emailState.newEmail, otp: emailState.otp },
        token
      });
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem("turf_user", JSON.stringify(merged));
      showNotice("Email address changed successfully.");
      setEmailOtpSent(false);
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <section className="profile-workspace">
      {/* Left Column: Premium Profile Card */}
      <aside className="profile-card">
        <div
          className="profile-photo"
          style={user?.profileImage ? { backgroundImage: `url(${user.profileImage})`, backgroundSize: "cover" } : {}}
        >
          {!user?.profileImage && (user?.name || "U").trim().charAt(0).toUpperCase()}
        </div>
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
        {user?.role === "staff" && (
          <span className="badge" style={{ marginTop: "6px", display: "inline-block", background: "#e8f5ed", color: "#163a23", fontWeight: 700, padding: "4px 10px", borderRadius: "999px", fontSize: "0.78rem" }}>
            Staff · {user?.assignedPlayground?.name || "Assigned Turf"}
          </span>
        )}

        <label className="photo-upload">
          Change profile photo
          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
        </label>
        <p>JPG, PNG or WebP, up to 5 MB.</p>

        <div className="account-actions">
          <button
            type="button"
            className="account-action"
            onClick={() => setProfileView("personal")}
          >
            <strong>Edit profile</strong>
            <span>Update contact details and personal info.</span>
          </button>
          <button
            type="button"
            className="account-action security"
            onClick={() => setProfileView("security")}
          >
            <strong>Change password</strong>
            <span>Secure account with verification OTP.</span>
          </button>
        </div>

        <div className="current-profile-info">
          {user?.role === "staff" && (
            <>
              <div><span>Designation</span><strong>{user?.staffTitle || "Gatekeeper / Entry Staff"}</strong></div>
              <div><span>Assigned Gate</span><strong>{user?.assignedPlayground?.name || "Playground Gate"}</strong></div>
            </>
          )}
          <div><span>Phone</span><strong>{user?.phone || "Not added"}</strong></div>
          <div><span>Address</span><strong>{user?.address || "Not added"}</strong></div>
          <div><span>Joined</span><strong>{prettyDate(user?.createdAt)}</strong></div>
        </div>
      </aside>

      {/* Right Column: Profile Form Card */}
      <article className="panel profile-form-card">
        <nav className="profile-section-nav" style={{ padding: 0, marginBottom: "16px" }}>
          <button
            type="button"
            className={profileView === "personal" ? "active" : ""}
            onClick={() => setProfileView("personal")}
          >
            Edit profile
          </button>
          <button
            type="button"
            className={profileView === "security" ? "active" : ""}
            onClick={() => setProfileView("security")}
          >
            Password & security
          </button>
        </nav>

        {profileView === "personal" ? (
          <div>
            <h2>Personal information</h2>
            <p>Keep your contact details and account information up to date.</p>
            <form onSubmit={handleSaveProfile} className="form-grid" style={{ marginTop: "18px" }}>
              <label>
                Full name
                <input
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </label>
              <label>
                Email address
                <input type="email" value={user.email} readOnly />
              </label>
              <label>
                Phone number
                <input
                  placeholder="01XXXXXXXXX"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </label>
              <label>
                Date of birth
                <input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                />
              </label>
              <label>
                Gender
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="full">
                Address
                <input
                  placeholder="House, road, area, district"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />
              </label>
              <div className="full" style={{ marginTop: "10px" }}>
                <button className="button" type="submit" style={{ width: "100%" }}>
                  Save personal information
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <h2>Password & security</h2>
            <p>Verification OTP is sent to your registered email before changes are confirmed.</p>

            {/* Change Password */}
            <h3 style={{ marginTop: "20px" }}>Change password</h3>
            <p className="item-meta">First request an OTP to current email, then enter it with your new password.</p>
            <form onSubmit={handleConfirmPasswordChange} className="form-grid" style={{ marginTop: "12px" }}>
              <div className="full">
                <button type="button" className="button alt" onClick={handleRequestPasswordOtp}>
                  {pwdOtpSent ? "Resend password OTP" : "Send password OTP"}
                </button>
              </div>
              {pwdOtpSent && (
                <>
                  <label>
                    New password
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={pwdState.newPassword}
                      onChange={(e) => setPwdState({ ...pwdState, newPassword: e.target.value })}
                    />
                  </label>
                  <label>
                    Confirm new password
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={pwdState.confirmPassword}
                      onChange={(e) => setPwdState({ ...pwdState, confirmPassword: e.target.value })}
                    />
                  </label>
                  <label className="full">
                    Verification OTP
                    <input
                      required
                      placeholder="6-digit code"
                      value={pwdState.otp}
                      onChange={(e) => setPwdState({ ...pwdState, otp: e.target.value })}
                    />
                  </label>
                  <div className="full">
                    <button className="button" type="submit">Verify & change password</button>
                  </div>
                </>
              )}
            </form>

            {/* Change Email */}
            <h3 style={{ marginTop: "28px" }}>Change email</h3>
            <p className="item-meta">Verify the OTP sent to your new email address before it is transferred.</p>
            <form onSubmit={handleConfirmEmailChange} className="form-grid" style={{ marginTop: "12px" }}>
              <label className="full">
                New email address
                <input
                  type="email"
                  required
                  value={emailState.newEmail}
                  onChange={(e) => setEmailState({ ...emailState, newEmail: e.target.value })}
                />
              </label>
              <div className="full">
                <button type="button" className="button alt" onClick={handleRequestEmailOtp}>
                  {emailOtpSent ? "Resend email OTP" : "Send verification OTP"}
                </button>
              </div>
              {emailOtpSent && (
                <>
                  <label className="full">
                    Verification OTP
                    <input
                      required
                      placeholder="6-digit code sent to new email"
                      value={emailState.otp}
                      onChange={(e) => setEmailState({ ...emailState, otp: e.target.value })}
                    />
                  </label>
                  <div className="full">
                    <button className="button" type="submit">Verify & change email</button>
                  </div>
                </>
              )}
            </form>
          </div>
        )}
      </article>
    </section>
  );
}

// ===================================================
// GLOBAL MODALS COMPONENT
// ===================================================
function Modals({ modal, data, close, token, showNotice, reload, playgrounds }) {
  const isEdit = modal === "edit-playground";
  const [groundForm, setGroundForm] = useState(() => ({
    name: data?.name || "",
    sportType: data?.sportType || "Football",
    description: data?.description || "",
    maxPlayers: data?.maxPlayers || 10,
    phone: data?.phone || "",
    email: data?.email || "",
    address: data?.address || "",
    division: data?.division || "Dhaka",
    district: data?.district || "Dhaka",
    area: data?.area || "",
    googleMapLocation: data?.googleMapLocation || "",
    openingTime: data?.openingTime || "06:00",
    closingTime: data?.closingTime || "23:00",
    morningPrice: data?.pricing?.morning || 1000,
    dayPrice: data?.pricing?.day || 1200,
    eveningPrice: data?.pricing?.evening || 1500,
    weekendPrice: data?.pricing?.weekend || 1600,
    facilities: Array.isArray(data?.facilities) ? data.facilities.join(", ") : (data?.facilities || "Floodlights, Parking, Changing Room")
  }));

  const [slotGen, setSlotGen] = useState({
    playgroundId: playgrounds?.[0]?._id || "",
    dayType: "everyday",
    openingTime: "06:00",
    closingTime: "23:00",
    durationMinutes: 60,
    slotsPerDay: 12,
    breakStartTime: "",
    breakEndTime: ""
  });

  const [adminCancelReason, setAdminCancelReason] = useState("");

  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    assignedPlayground: playgrounds?.[0]?._id || "",
    staffTitle: "Gatekeeper / Entry Staff"
  });
  const [savingStaff, setSavingStaff] = useState(false);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.assignedPlayground) {
      return showNotice("Please assign a playground for this staff member.", "error");
    }
    if (!staffForm.password || staffForm.password.length < 6) {
      return showNotice("Password must be at least 6 characters long.", "error");
    }
    setSavingStaff(true);
    try {
      await request("/users/staff", {
        method: "POST",
        body: staffForm,
        token
      });
      showNotice(`Staff account created for ${staffForm.name}! They can now log in and scan passes.`);
      close();
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      setSavingStaff(false);
    }
  };

  const handleSaveGround = async (e) => {
    e.preventDefault();
    const payload = {
      name: groundForm.name.trim(),
      sportType: groundForm.sportType,
      description: groundForm.description.trim(),
      maxPlayers: Number(groundForm.maxPlayers),
      phone: groundForm.phone.trim(),
      email: groundForm.email.trim(),
      address: groundForm.address.trim(),
      division: groundForm.division.trim(),
      district: groundForm.district.trim(),
      area: groundForm.area.trim(),
      googleMapLocation: groundForm.googleMapLocation.trim(),
      openingTime: groundForm.openingTime,
      closingTime: groundForm.closingTime,
      pricing: {
        morning: Number(groundForm.morningPrice),
        day: Number(groundForm.dayPrice),
        evening: Number(groundForm.eveningPrice),
        weekend: Number(groundForm.weekendPrice)
      },
      facilities: groundForm.facilities.split(",").map((f) => f.trim()).filter(Boolean)
    };
    try {
      if (isEdit) {
        await request(`/playgrounds/${data._id}`, { method: "PATCH", body: payload, token });
        showNotice("Playground details saved successfully.");
      } else {
        await request("/playgrounds", { method: "POST", body: payload, token });
        showNotice("Playground registered and submitted for review.");
      }
      close();
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    const toMin = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const formatMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    const days = slotGen.dayType === "weekdays" ? [0, 1, 2, 3, 4] : slotGen.dayType === "weekend" ? [5, 6] : [0, 1, 2, 3, 4, 5, 6];
    const opening = toMin(slotGen.openingTime);
    const closing = toMin(slotGen.closingTime);
    const dur = Number(slotGen.durationMinutes);
    const hasBreak = Boolean(slotGen.breakStartTime && slotGen.breakEndTime);
    const bStart = hasBreak ? toMin(slotGen.breakStartTime) : -1;
    const bEnd = hasBreak ? toMin(slotGen.breakEndTime) : -1;

    const dailySlots = [];
    let cur = opening;
    while (dailySlots.length < Number(slotGen.slotsPerDay) && cur + dur <= closing) {
      if (hasBreak && cur < bEnd && cur + dur > bStart) cur = bEnd;
      if (cur + dur > closing) break;
      dailySlots.push({
        startTime: formatMin(cur),
        endTime: formatMin(cur + dur),
        durationMinutes: dur
      });
      cur += dur;
    }

    const payload = {
      playground: slotGen.playgroundId,
      slots: days.flatMap((d) => dailySlots.map((s) => ({ ...s, dayOfWeek: d, playground: slotGen.playgroundId })))
    };

    try {
      await request("/slots/bulk", { method: "POST", body: payload, token });
      showNotice(`Successfully created ${payload.slots.length} slots!`);
      close();
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleAdminCancelSubmit = async (e) => {
    e.preventDefault();
    if (!adminCancelReason.trim()) return showNotice("Please provide a reason for the customer.", "error");
    try {
      const cancelled = await request(`/bookings/${data._id}/admin-cancel`, {
        method: "PATCH",
        body: { reason: adminCancelReason.trim() },
        token
      });
      showNotice(cancelled?.refundAmount ? `Booking cancelled. BDT ${cancelled.refundAmount} was refunded.` : "Booking cancelled and customer notified.");
      close();
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", padding: 0 }}>
        {/* ADD OR EDIT PLAYGROUND (matches legacy playground-editor.css) */}
        {(modal === "add-playground" || modal === "edit-playground") && (
          <form className="playground-editor" onSubmit={handleSaveGround}>
            <header className="playground-editor__head">
              <span>PLAYGROUND SETTINGS</span>
              <h2>{isEdit ? `Edit ${data.name}` : "Add Playground"}</h2>
              <p>Keep your venue information, prices and customer contact details up to date.</p>
            </header>

            <section className="playground-editor__section">
              <h3>Venue details</h3>
              <div className="form-grid">
                <label className="full">
                  Playground name
                  <input required value={groundForm.name} onChange={(e) => setGroundForm({ ...groundForm, name: e.target.value })} />
                </label>
                <label>
                  Sport type
                  <select value={groundForm.sportType} onChange={(e) => setGroundForm({ ...groundForm, sportType: e.target.value })}>
                    <option>Football</option>
                    <option>Cricket</option>
                    <option>Badminton</option>
                  </select>
                </label>
                <label>
                  Maximum players
                  <input type="number" min={1} required value={groundForm.maxPlayers} onChange={(e) => setGroundForm({ ...groundForm, maxPlayers: e.target.value })} />
                </label>
                <label className="full">
                  Description
                  <textarea required value={groundForm.description} onChange={(e) => setGroundForm({ ...groundForm, description: e.target.value })} />
                </label>
              </div>
            </section>

            <section className="playground-editor__section">
              <h3>Contact & location</h3>
              <div className="form-grid">
                <label>
                  Phone number
                  <input required value={groundForm.phone} onChange={(e) => setGroundForm({ ...groundForm, phone: e.target.value })} />
                </label>
                <label>
                  Email address
                  <input type="email" required value={groundForm.email} onChange={(e) => setGroundForm({ ...groundForm, email: e.target.value })} />
                </label>
                <label className="full">
                  Street address
                  <input required value={groundForm.address} onChange={(e) => setGroundForm({ ...groundForm, address: e.target.value })} />
                </label>
                <label>
                  Division
                  <input required value={groundForm.division} onChange={(e) => setGroundForm({ ...groundForm, division: e.target.value })} />
                </label>
                <label>
                  District
                  <input required value={groundForm.district} onChange={(e) => setGroundForm({ ...groundForm, district: e.target.value })} />
                </label>
                <label>
                  Area
                  <input required value={groundForm.area} onChange={(e) => setGroundForm({ ...groundForm, area: e.target.value })} />
                </label>
                <label>
                  Google Maps link
                  <input type="url" value={groundForm.googleMapLocation} onChange={(e) => setGroundForm({ ...groundForm, googleMapLocation: e.target.value })} placeholder="https://maps.google.com/..." />
                </label>
              </div>
            </section>

            <section className="playground-editor__section">
              <h3>Hours & pricing (BDT)</h3>
              <div className="form-grid">
                <label>
                  Opening time
                  <input type="time" required value={groundForm.openingTime} onChange={(e) => setGroundForm({ ...groundForm, openingTime: e.target.value })} />
                </label>
                <label>
                  Closing time
                  <input type="time" required value={groundForm.closingTime} onChange={(e) => setGroundForm({ ...groundForm, closingTime: e.target.value })} />
                </label>
                <label>
                  Morning price
                  <input type="number" min={0} required value={groundForm.morningPrice} onChange={(e) => setGroundForm({ ...groundForm, morningPrice: e.target.value })} />
                </label>
                <label>
                  Day price
                  <input type="number" min={0} required value={groundForm.dayPrice} onChange={(e) => setGroundForm({ ...groundForm, dayPrice: e.target.value })} />
                </label>
                <label>
                  Evening price
                  <input type="number" min={0} required value={groundForm.eveningPrice} onChange={(e) => setGroundForm({ ...groundForm, eveningPrice: e.target.value })} />
                </label>
                <label>
                  Weekend price
                  <input type="number" min={0} required value={groundForm.weekendPrice} onChange={(e) => setGroundForm({ ...groundForm, weekendPrice: e.target.value })} />
                </label>
              </div>
            </section>

            <section className="playground-editor__section">
              <h3>Facilities</h3>
              <label>
                Available facilities (comma separated)
                <input value={groundForm.facilities} onChange={(e) => setGroundForm({ ...groundForm, facilities: e.target.value })} />
              </label>
            </section>

            <footer className="playground-editor__actions">
              <button type="button" className="button alt" onClick={close}>Cancel</button>
              <button type="submit" className="button">Save all changes</button>
            </footer>
          </form>
        )}

        {/* GENERATE SLOTS MODAL */}
        {modal === "add-slots" && (
          <form className="playground-editor" onSubmit={handleGenerateSlots}>
            <header className="playground-editor__head">
              <span>AUTOMATED SCHEDULE</span>
              <h2>Generate Weekly Slots</h2>
              <p>Configure recurring weekly slots, durations, and break intervals.</p>
            </header>

            <section className="playground-editor__section">
              <div className="form-grid">
                <label className="full">
                  Select Playground
                  <select required value={slotGen.playgroundId} onChange={(e) => setSlotGen({ ...slotGen, playgroundId: e.target.value })}>
                    {playgrounds.map((g) => (
                      <option key={g._id} value={g._id}>{g.name} ({g.sportType})</option>
                    ))}
                  </select>
                </label>
                <label>
                  Day schedule
                  <select value={slotGen.dayType} onChange={(e) => setSlotGen({ ...slotGen, dayType: e.target.value })}>
                    <option value="everyday">Everyday (All 7 Days)</option>
                    <option value="weekdays">Weekdays (Sun – Thu)</option>
                    <option value="weekend">Weekend (Fri – Sat)</option>
                  </select>
                </label>
                <label>
                  Slot duration
                  <select value={slotGen.durationMinutes} onChange={(e) => setSlotGen({ ...slotGen, durationMinutes: e.target.value })}>
                    <option value={60}>60 Minutes</option>
                    <option value={90}>90 Minutes</option>
                    <option value={120}>120 Minutes</option>
                  </select>
                </label>
                <label>
                  Opening time
                  <input type="time" required value={slotGen.openingTime} onChange={(e) => setSlotGen({ ...slotGen, openingTime: e.target.value })} />
                </label>
                <label>
                  Closing time
                  <input type="time" required value={slotGen.closingTime} onChange={(e) => setSlotGen({ ...slotGen, closingTime: e.target.value })} />
                </label>
                <label>
                  Break start (optional)
                  <input type="time" value={slotGen.breakStartTime} onChange={(e) => setSlotGen({ ...slotGen, breakStartTime: e.target.value })} />
                </label>
                <label>
                  Break end (optional)
                  <input type="time" value={slotGen.breakEndTime} onChange={(e) => setSlotGen({ ...slotGen, breakEndTime: e.target.value })} />
                </label>
                <label className="full">
                  Max slots per day
                  <input type="number" min={1} max={24} value={slotGen.slotsPerDay} onChange={(e) => setSlotGen({ ...slotGen, slotsPerDay: e.target.value })} />
                </label>
              </div>
            </section>

            <footer className="playground-editor__actions">
              <button type="button" className="button alt" onClick={close}>Cancel</button>
              <button type="submit" className="button">Create slots</button>
            </footer>
          </form>
        )}

        {/* ADD STAFF MODAL (FOR PLAYGROUND ADMIN) */}
        {modal === "add-staff" && (
          <form className="playground-editor" onSubmit={handleCreateStaff}>
            <header className="playground-editor__head">
              <span>VENUE ACCESS</span>
              <h2>Add Venue Staff / Employee</h2>
              <p>Create gatekeeper credentials to scan QR passes and verify customer check-ins at your playground.</p>
            </header>

            <section className="playground-editor__section">
              <h3>Employee credentials</h3>
              <div className="form-grid">
                <label className="full">
                  Employee full name
                  <input
                    required
                    placeholder="e.g. Kamal Hossain"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  />
                </label>
                <label>
                  Login email address
                  <input
                    type="email"
                    required
                    placeholder="staff.kamal@turf.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  />
                </label>
                <label>
                  Login password (min 6 chars)
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Set password for staff"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  />
                </label>
                <label>
                  Contact phone
                  <input
                    placeholder="+8801700000000"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  />
                </label>
                <label>
                  Job title / role
                  <input
                    placeholder="Gatekeeper / Entry Staff"
                    value={staffForm.staffTitle}
                    onChange={(e) => setStaffForm({ ...staffForm, staffTitle: e.target.value })}
                  />
                </label>
                <label className="full">
                  Assigned playground gate
                  <select
                    required
                    value={staffForm.assignedPlayground}
                    onChange={(e) => setStaffForm({ ...staffForm, assignedPlayground: e.target.value })}
                  >
                    <option value="">-- Select Playground --</option>
                    {playgrounds.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name} ({g.sportType} · {g.area || g.district || "Dhaka"})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <footer className="playground-editor__actions">
              <button type="button" className="button alt" onClick={close}>Cancel</button>
              <button type="submit" className="button" disabled={savingStaff}>
                {savingStaff ? "Creating account…" : "Create staff account"}
              </button>
            </footer>
          </form>
        )}

        {/* VIEW QR TICKET PASS (matches digital ticket layout) */}
        {modal === "view-ticket" && data && (
          <div style={{ padding: "30px", textAlign: "center" }}>
            <span className="eyebrow">DIGITAL QR PASS</span>
            <h2 style={{ margin: "4px 0 6px", fontSize: "1.5rem" }}>{data.playground?.name || "TURF Entry Pass"}</h2>
            <p className="item-meta">{prettyDate(data.bookingDate)} · {data.startTime} – {data.endTime}</p>

            <div className="qr-ticket-pass" style={{ margin: "20px auto", maxWidth: "340px" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data._id)}`}
                alt="Ticket QR"
              />
              <strong style={{ display: "block", marginTop: "14px", fontSize: "0.95rem", color: "#163a23" }}>
                TICKET #{String(data._id).slice(-8).toUpperCase()}
              </strong>
              <small style={{ color: "#68766d", fontSize: "0.78rem" }}>Show this QR code at the venue scanner</small>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "18px" }}>
              <button type="button" className="button alt" onClick={close}>Close</button>
              <button type="button" className="button" onClick={() => window.print()}>Print pass</button>
            </div>
          </div>
        )}

        {/* AUTHENTIC RECEIPT MODAL (matches receipt.html) */}
          {modal === "view-receipt" && data && (
            <div className="receipt-modal-box">
              <header className="receipt-header">
                <div>
                  <p className="brand">TURF</p>
                  <h1>Entry Pass &amp; Money Receipt</h1>
                  <p className="sub">Keep this document and show the QR code at the venue gate.</p>
                </div>
                <span className="receipt-badge-paid">PAID</span>
              </header>

              <div className="receipt-ticket-info">
                <div>
                  <span className="eyebrow">{data.booking ? "SLOT BOOKING" : "TOURNAMENT PASS"}</span>
                  <h2>{data.title || data.booking?.playground?.name || data.tournamentTeam?.tournament?.name || "TURF Entry Pass"}</h2>
                  <p>
                    {data.booking
                      ? `${prettyDate(data.booking.bookingDate)} · ${data.booking.startTime} - ${data.booking.endTime}`
                      : (data.tournamentTeam ? `Team: ${data.tournamentTeam.teamName}` : prettyDate(data.createdAt))}
                    <br />
                    {data.booking?.playground?.address || "Venue entry confirmed"}
                  </p>
                </div>
                <img
                  className="receipt-qr-thumb"
                  src={data.booking?.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.booking?._id || data._id || "turf")}`}
                  alt="Entry QR"
                />
              </div>

              <div className="receipt-details-list">
                <div className="receipt-detail-row">
                  <span>Customer Name</span>
                  <strong>{user?.name || "Customer"}</strong>
                </div>
                <div className="receipt-detail-row">
                  <span>Customer Email</span>
                  <strong>{user?.email || "Email on record"}</strong>
                </div>
                <div className="receipt-detail-row">
                  <span>Payment Method</span>
                  <strong>{data.paymentMethod || "Digital Payment / Online"}</strong>
                </div>
                <div className="receipt-detail-row">
                  <span>Payment Reference / ID</span>
                  <strong>#{String(data._id || data.paymentId || "00000000").slice(-10).toUpperCase()}</strong>
                </div>
                <div className="receipt-detail-row">
                  <span>Issue Date</span>
                  <strong>{prettyDate(data.createdAt || new Date())}</strong>
                </div>
              </div>

              <div className="receipt-total">
                <span>Total Paid</span>
                <strong>৳{new Intl.NumberFormat("en-BD").format(data.amount || data.totalAmount || data.booking?.totalAmount || 0)}</strong>
              </div>

              <p className="receipt-footer-note">
                Generated electronically by TURF. This is a valid payment receipt and entry pass.
              </p>

              <div className="receipt-modal-actions">
                <button type="button" className="button alt" onClick={close}>Close</button>
                <button type="button" className="button" onClick={() => window.print()}>Print / Save PDF</button>
              </div>
            </div>
          )}

          {/* ADMIN CANCELLATION MODAL (matches management.js admin cancel) */}
        {modal === "admin-cancel" && data && (
          <section className="cancellation-box" style={{ padding: "26px" }}>
            <span className="eyebrow" style={{ color: "#a53636" }}>VENUE ACTION</span>
            <h2 style={{ margin: "6px 0 4px" }}>Cancel this booked slot?</h2>
            <p className="item-meta">
              Customer: <strong>{data.customer?.name}</strong> · Venue: <strong>{data.playground?.name}</strong><br />
              {prettyDate(data.bookingDate)} · {data.startTime} – {data.endTime}
            </p>
            <form onSubmit={handleAdminCancelSubmit} style={{ marginTop: "16px" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
                Reason for cancellation (shared with customer)
                <textarea
                  required
                  placeholder="Example: The field is unavailable due to urgent turf maintenance."
                  value={adminCancelReason}
                  onChange={(e) => setAdminCancelReason(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d9e9de", minHeight: "80px" }}
                />
              </label>
              <p style={{ margin: "14px 0", fontSize: "0.84rem", color: "#546258" }}>
                Are you sure you want to cancel this booking? The customer will be notified and any paid amount will be fully refunded.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="button alt" onClick={close}>Keep booking</button>
                <button type="submit" className="button" style={{ background: "#c6443c" }}>Cancel, refund & notify</button>
              </div>
            </form>
          </section>
        )}

        {/* VIEW GROUND DETAILS (SUPER ADMIN) */}
        {modal === "view-ground" && data && (
          <div style={{ padding: "28px" }}>
            <span className="eyebrow">{data.sportType}</span>
            <h2 style={{ margin: "6px 0 4px" }}>{data.name}</h2>
            <p className="item-meta">{data.address || `${data.area}, ${data.district}`}</p>

            <div className="ground-detail-grid">
              <div><b>Location</b><span>{[data.address, data.area, data.district, data.division].filter(Boolean).join(", ")}</span></div>
              <div><b>Venue contact</b><span>{data.phone}<br />{data.email}</span></div>
              <div><b>Admin owner</b><span>{data.playgroundAdmin?.name || "Not listed"}<br />{data.playgroundAdmin?.email || ""}</span></div>
              <div><b>Capacity</b><span>{data.maxPlayers} max players</span></div>
              <div><b>Hours</b><span>{data.openingTime} – {data.closingTime}</span></div>
              <div><b>Facilities</b><span>{(data.facilities || []).join(", ") || "Not listed"}</span></div>
            </div>

            <h3>Pricing</h3>
            <div className="ground-detail-grid">
              <div><b>Morning</b><span>৳{data.pricing?.morning || 0}</span></div>
              <div><b>Day</b><span>৳{data.pricing?.day || 0}</span></div>
              <div><b>Evening</b><span>৳{data.pricing?.evening || 0}</span></div>
              <div><b>Weekend</b><span>৳{data.pricing?.weekend || 0}</span></div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button type="button" className="button alt" onClick={close}>Close</button>
              {data.googleMapLocation && (
                <a className="button" target="_blank" rel="noopener noreferrer" href={data.googleMapLocation}>Open map location</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================================
// TURF DIALOG COMPONENT (matches legacy ui-dialog.js)
// ===================================================
function TurfDialogModal({ dialog, close }) {
  const { title, message, confirmLabel = "Confirm", danger = false, onConfirm } = dialog;

  const handleConfirm = async () => {
    close();
    if (onConfirm) await onConfirm();
  };

  return (
    <div className="turf-dialog-backdrop" onClick={close}>
      <div className="turf-dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`turf-dialog-icon ${danger ? "danger" : "primary"}`}>
          {danger ? "!" : "✓"}
        </div>
        <div className="turf-dialog-copy">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <div className="turf-dialog-actions" style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <button type="button" className="button alt" onClick={close}>Cancel</button>
          <button
            type="button"
            className="button"
            style={danger ? { background: "#c6443c" } : {}}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
