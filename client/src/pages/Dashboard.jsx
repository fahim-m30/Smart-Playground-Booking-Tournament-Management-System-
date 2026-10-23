import { useEffect, useState, useMemo } from "react";
import "./Dashboard.css";
import { API, money, prettyDate, isoDate, request } from "../services/api";

// ===================================================
// Inline SVG Icons
// ===================================================
function NavIcon({ name }) {
  const icons = {
    overview: <svg viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>,
    playgrounds: <svg viewBox="0 0 24 24"><path d="M4 19V8l8-5 8 5v11h-5v-5H9v5H4Zm3-8h2V9H7v2Zm0 3h2v-2H7v2Zm8-3h2V9h-2v2Zm0 3h2v-2h-2v2Z"/></svg>,
    booking: <svg viewBox="0 0 24 24"><path d="M7 2v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 8h3m-3 3h6"/></svg>,
    bookings: <svg viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 5h8M8 13h8m-8 4h5"/></svg>,
    tournament: <svg viewBox="0 0 24 24"><path d="M8 3h8v4a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 0v5m-3 5h6m-8 0h10"/></svg>,
    account: <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>,
    reports: <svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6"/></svg>,
    slots: <svg viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 5h8m-8 4h4m4 0h.01M8 17h4"/></svg>,
    income: <svg viewBox="0 0 24 24"><path d="M12 3v18m4-14.5c-.7-.8-1.9-1.3-3.5-1.3-2.3 0-3.8 1.1-3.8 2.8 0 1.7 1.4 2.4 3.8 3 2.4.6 3.8 1.4 3.8 3.2 0 1.8-1.5 3-4 3-1.8 0-3.2-.6-4.1-1.7"/></svg>,
    users: <svg viewBox="0 0 24 24"><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20m11-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm3 3.8a4 4 0 0 1 4 3.7V20"/></svg>,
    scanner: <svg viewBox="0 0 24 24"><path d="M3 4h6V2H3a2 2 0 0 0-2 2v6h2V4Zm0 16H1v-6h2v6a2 2 0 0 0 2 2h4v-2H5a2 2 0 0 1-2-2Zm18-16v6h2V4a2 2 0 0 0-2-2h-6v2h6ZM7 7h10v10H7V7Zm2 2v6h6V9H9Zm12 7h-2v4a2 2 0 0 1-2 2h-4v2h6a2 2 0 0 0 2-2v-6Z"/></svg>
  };
  return <span className="nav-icon">{icons[name] || icons.overview}</span>;
}

export default function Dashboard({ token, user, setUser, navigate, logout, openAuth, showNotice }) {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Common Platform Data
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

  // Modals & Interactive States
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [slotDate, setSlotDate] = useState(() => isoDate());

  // Date and Time Helpers
  const role = user?.role || "customer";

  // Navigation Items by Role
  const navItems = useMemo(() => {
    const common = [{ id: "overview", label: "Overview", icon: "overview" }];
    if (role === "customer") {
      return [
        ...common,
        { id: "my-bookings", label: "My Bookings", icon: "bookings" },
        { id: "reports", label: "Report Issue", icon: "reports" },
        { id: "profile", label: "Account Centre", icon: "account" }
      ];
    }
    if (role === "playground-admin") {
      return [
        ...common,
        { id: "playgrounds", label: "Venue Management", icon: "playgrounds" },
        { id: "slots", label: "Slot Schedules", icon: "slots" },
        { id: "bookings", label: "All Bookings", icon: "bookings" },
        { id: "scanner", label: "QR Scanner", icon: "scanner" },
        { id: "income", label: "Income & Refunds", icon: "income" },
        { id: "reports", label: "Customer Reports", icon: "reports" },
        { id: "profile", label: "Account Centre", icon: "account" }
      ];
    }
    if (role === "super-admin") {
      return [
        ...common,
        { id: "playgrounds", label: "Playground Control", icon: "playgrounds" },
        { id: "users", label: "User Control", icon: "users" },
        { id: "reports", label: "Report Queue", icon: "reports" },
        { id: "profile", label: "Account Centre", icon: "account" }
      ];
    }
    return common;
  }, [role]);

  // Load Main Role-Based Data
  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Tournaments
      const tourneys = await request("/tournaments").catch(() => []);
      setTournaments(tourneys || []);

      // 2. Tournament Matches for Live Scoreboard
      if (tourneys?.length) {
        const matchPromises = tourneys.slice(0, 6).map((t) => request(`/tournaments/${t._id}/matches`).catch(() => []));
        const resolvedMatches = await Promise.all(matchPromises);
        setMatches(resolvedMatches.flat());
      }

      // 3. Customer Data
      if (role === "customer") {
        const [myB, myR, allP] = await Promise.all([
          request("/bookings/my-bookings", { token }).catch(() => []),
          request("/reports/my-reports", { token }).catch(() => []),
          request("/playgrounds").catch(() => [])
        ]);
        setBookings(myB || []);
        setMyReports(myR || []);
        setPlaygrounds(allP || []);
      }

      // 4. Playground Admin Data
      if (role === "playground-admin") {
        const [myGrounds, income, repCust, myR] = await Promise.all([
          request("/playgrounds/my-playgrounds", { token }).catch(() => []),
          request("/payments/playground-admin/income", { token }).catch(() => null),
          request("/reports/reportable-customers", { token }).catch(() => []),
          request("/reports/my-reports", { token }).catch(() => [])
        ]);
        setPlaygrounds(myGrounds || []);
        setIncomeData(income);
        setReportableCustomers(repCust || []);
        setMyReports(myR || []);

        // Load slots and bookings for each playground
        if (myGrounds?.length) {
          const slotsPromises = myGrounds.map(async (g) => {
            const groundSlots = await request(`/slots/playground/${g._id}`, { token }).catch(() => []);
            const groundBookings = await request(`/bookings/playground/${g._id}`, { token }).catch(() => []);
            return { ground: g, slots: groundSlots || [], bookings: groundBookings || [] };
          });
          const groundDetails = await Promise.all(slotsPromises);
          setSlotsList(groundDetails);
          const allB = groundDetails.flatMap((d) => d.bookings.map((b) => ({ ...b, playground: d.ground })));
          setBookings(allB);
        }
      }

      // 5. Super Admin Data
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

  if (!user) {
    return (
      <main className="login-prompt page">
        <h1>Your game plan, all in one place.</h1>
        <p>Sign in to view your dashboard, bookings, venue controls, and matches.</p>
        <button className="btn btn-primary" onClick={openAuth}>Sign in to continue</button>
      </main>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <button className="dash-brand" onClick={() => navigate("home")}>
          <img src="/legacy/assets/images/favicon.png" alt="TURF" />
          <span>
            <b>TURF</b>
            <small>Workspace</small>
          </span>
        </button>

        <p className="workspace-label">{role.replace("-", " ")} WORKSPACE</p>

        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="back-home" onClick={() => navigate("home")}>
          ← Back to website
        </button>
      </aside>

      {/* Main Workspace */}
      <main className="dash-main">
        {/* Topbar */}
        <header className="dash-topbar">
          <div>
            <p className="dash-eyebrow">{role.replace("-", " ").toUpperCase()}</p>
            <h1>Welcome back, {user.name?.split(" ")[0]}</h1>
          </div>

          <div className="topbar-tools">
            <div className="weather-date">
              <span className="weather-icon">☀</span>
              <div>
                <strong>Dhaka 28°C</strong>
                <span>{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
            </div>

            <div className="account-menu">
              <div
                className="avatar"
                style={user.profileImage ? { backgroundImage: `url(${user.profileImage})` } : {}}
              >
                {!user.profileImage && (user.name?.[0] || "U").toUpperCase()}
              </div>
              <div className="account-copy">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <button className="logout-button" onClick={logout}>Log out</button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="card"><p className="item-meta">Loading workspace data...</p></div>
        ) : (
          <>
            {/* 1. OVERVIEW TAB */}
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

            {/* 2. CUSTOMER: MY BOOKINGS */}
            {tab === "my-bookings" && (
              <CustomerBookingsTab
                bookings={bookings}
                token={token}
                showNotice={showNotice}
                reload={loadData}
                setActiveModal={setActiveModal}
                setModalData={setModalData}
              />
            )}

            {/* 3. PLAYGROUND ADMIN: VENUE MANAGEMENT */}
            {tab === "playgrounds" && role === "playground-admin" && (
              <VenueManagementTab
                playgrounds={playgrounds}
                token={token}
                showNotice={showNotice}
                reload={loadData}
                setActiveModal={setActiveModal}
                setModalData={setModalData}
              />
            )}

            {/* 4. SUPER ADMIN: PLAYGROUND APPROVAL */}
            {tab === "playgrounds" && role === "super-admin" && (
              <SuperAdminPlaygroundsTab
                playgrounds={playgrounds}
                token={token}
                showNotice={showNotice}
                reload={loadData}
                setActiveModal={setActiveModal}
                setModalData={setModalData}
              />
            )}

            {/* 5. SLOTS MANAGEMENT (PLAYGROUND ADMIN) */}
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
              />
            )}

            {/* 6. ADMIN BOOKINGS */}
            {tab === "bookings" && role === "playground-admin" && (
              <AdminBookingsTab
                bookings={bookings}
                token={token}
                showNotice={showNotice}
                reload={loadData}
                setActiveModal={setActiveModal}
                setModalData={setModalData}
              />
            )}

            {/* 7. QR SCANNER (PLAYGROUND ADMIN) */}
            {tab === "scanner" && (
              <QRScannerTab token={token} showNotice={showNotice} />
            )}

            {/* 8. INCOME & REFUNDS (PLAYGROUND ADMIN) */}
            {tab === "income" && (
              <IncomeTab
                incomeData={incomeData}
                token={token}
                showNotice={showNotice}
                reload={loadData}
              />
            )}

            {/* 9. USER CONTROL (SUPER ADMIN) */}
            {tab === "users" && (
              <UserControlTab
                users={allUsers}
                token={token}
                showNotice={showNotice}
                reload={loadData}
              />
            )}

            {/* 10. REPORTS */}
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

            {/* 11. PROFILE / ACCOUNT CENTRE */}
            {tab === "profile" && (
              <AccountCentreTab
                user={user}
                setUser={setUser}
                token={token}
                showNotice={showNotice}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals Container */}
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
    </div>
  );
}

// ===================================================
// SUB-TAB 1: OVERVIEW TAB (Role-Adaptive)
// ===================================================
function OverviewTab({
  role, user, bookings, tournaments, playgrounds, slotsList, incomeData, allUsers, matches, setTab, setActiveModal, setModalData, navigate
}) {
  const activeBookings = bookings.filter((b) => !["Cancelled", "Completed"].includes(b.bookingStatus));
  const activeSlotsCount = slotsList.flatMap((d) => d.slots).filter((s) => s.isActive).length;

  return (
    <>
      {/* Role Stats Row */}
      <section className="stats">
        {role === "customer" && (
          <>
            <article className="stat-card"><span>Active Bookings</span><strong>{activeBookings.length}</strong></article>
            <article className="stat-card"><span>Live Tournaments</span><strong>{tournaments.length}</strong></article>
            <article className="stat-card"><span>Booking History</span><strong>{bookings.length}</strong></article>
          </>
        )}
        {role === "playground-admin" && (
          <>
            <article className="stat-card"><span>My Playgrounds</span><strong>{playgrounds.length}</strong></article>
            <article className="stat-card"><span>Active Slot Schedules</span><strong>{activeSlotsCount}</strong></article>
            <article className="stat-card"><span>Total Earnings</span><strong>{money(incomeData?.total)}</strong></article>
          </>
        )}
        {role === "super-admin" && (
          <>
            <article className="stat-card"><span>Total Customers</span><strong>{allUsers.filter((u) => u.role === "customer").length}</strong></article>
            <article className="stat-card"><span>Total Playgrounds</span><strong>{playgrounds.length}</strong></article>
            <article className="stat-card"><span>Playground Admins</span><strong>{allUsers.filter((u) => u.role === "playground-admin").length}</strong></article>
          </>
        )}
      </section>

      {/* Live Tournament Ticker */}
      {tournaments.length > 0 && (
        <div className="ticker">
          <span className="ticker-label">LIVE & UPCOMING</span>
          <div className="ticker-track">
            {tournaments.map((t) => (
              <div key={t._id} className="ticker-item">
                <strong>{t.name}</strong>
                <small>• {t.sportType} · Starts {prettyDate(t.startDate)}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Quick Pinned Bookings */}
      {role === "customer" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Pinned for you</h2>
              <p>Your upcoming reservations appear here for quick access.</p>
            </div>
            <button className="text-link" onClick={() => setTab("my-bookings")}>View all bookings →</button>
          </div>
          <div className="pinned-grid">
            {activeBookings.length ? (
              activeBookings.slice(0, 3).map((b) => (
                <article key={b._id} className="pin-card">
                  <h3>{b.playground?.name || "Playground Reservation"}</h3>
                  <p>
                    {prettyDate(b.bookingDate)} · {b.startTime} - {b.endTime}<br />
                    {b.playground?.address || "Address pending"}
                  </p>
                </article>
              ))
            ) : (
              <div className="card"><p className="item-meta">No upcoming bookings. Choose a playground to reserve your slot.</p></div>
            )}
          </div>
        </>
      )}

      {/* Playground Admin Quick Setup Cards */}
      {role === "playground-admin" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Quick Setup</h2>
              <p>Register new venues and configure automated schedule generation.</p>
            </div>
          </div>
          <div className="pinned-grid">
            <article className="pin-card" style={{ cursor: "pointer" }} onClick={() => { setActiveModal("add-playground"); }}>
              <h3>+ Add Playground</h3>
              <p>Register a new venue with sport type, pricing, location and photos.</p>
            </article>
            <article className="pin-card" style={{ cursor: "pointer" }} onClick={() => { setActiveModal("add-slots"); }}>
              <h3>⏱ Generate Slots</h3>
              <p>Auto-generate daily slots with opening hours, break times, and duration.</p>
            </article>
          </div>
        </>
      )}

      {/* Live Scores & Match Results */}
      {matches.length > 0 && (
        <section className="match-results-section">
          <div className="section-heading">
            <div>
              <h2>Live scores & upcoming fixtures</h2>
              <p>Official match status published across platform tournaments.</p>
            </div>
          </div>
          <div className="match-results-grid">
            {matches.slice(0, 4).map((m) => (
              <article key={m._id} className={`match-result-card ${m.matchStatus === "Live" ? "live" : ""}`}>
                <div className="match-result-meta">
                  <span className={`status ${m.matchStatus?.toLowerCase()}`}>{m.matchStatus || "Scheduled"}</span>
                  <span>{prettyDate(m.matchDate)} · {m.startTime}</span>
                </div>
                <div className="match-score">
                  <strong>{m.teamA?.teamName || "Team A"}</strong>
                  <b>{m.matchStatus === "Scheduled" ? "VS" : `${m.teamAScore || 0} - ${m.teamBScore || 0}`}</b>
                  <strong>{m.teamB?.teamName || "Team B"}</strong>
                </div>
                <p className="item-meta">{m.playground?.name || "Venue"} · {m.stage || "Group Match"}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Split Activity Panels */}
      <section className="split-grid">
        <article className="panel">
          <h2 className="panel-title">
            {role === "customer" ? "Recent Bookings" : role === "playground-admin" ? "Recent Venue Bookings" : "Platform Venues"}
          </h2>
          <div className="list">
            {role !== "super-admin" ? (
              bookings.slice(0, 5).map((b) => (
                <div key={b._id} className="list-row">
                  <div>
                    <div className="item-title">{b.playground?.name || "Playground"}</div>
                    <p className="item-meta">{prettyDate(b.bookingDate)} · {b.startTime} - {b.endTime}</p>
                  </div>
                  <span className={`status ${b.bookingStatus?.toLowerCase()}`}>{b.bookingStatus}</span>
                </div>
              ))
            ) : (
              playgrounds.slice(0, 5).map((g) => (
                <div key={g._id} className="list-row">
                  <div>
                    <div className="item-title">{g.name}</div>
                    <p className="item-meta">{g.area}, {g.district} · {g.sportType}</p>
                  </div>
                  <span className={`status ${g.isApproved ? "confirmed" : "pending"}`}>{g.isApproved ? "Approved" : "Pending"}</span>
                </div>
              ))
            )}
            {!bookings.length && role !== "super-admin" && <p className="item-meta">No booking records yet.</p>}
          </div>
        </article>

        <article className="panel">
          <h2 className="panel-title">Tournaments & Competitions</h2>
          <div className="list">
            {tournaments.slice(0, 5).map((t) => (
              <div key={t._id} className="list-row">
                <div>
                  <div className="item-title">{t.name}</div>
                  <p className="item-meta">{t.sportType} · Starts {prettyDate(t.startDate)}</p>
                </div>
                <span className="status confirmed">{t.status || "Upcoming"}</span>
              </div>
            ))}
            {!tournaments.length && <p className="item-meta">No active tournaments listed.</p>}
          </div>
        </article>
      </section>
    </>
  );
}

// ===================================================
// SUB-TAB 2: CUSTOMER MY BOOKINGS (with QR Ticket & Cancel)
// ===================================================
function CustomerBookingsTab({ bookings, token, showNotice, reload, setActiveModal, setModalData }) {
  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>My Bookings & QR Tickets</h2>
          <p>Access your reserved ground slots, digital tickets and cancellation options.</p>
        </div>
      </div>

      <div className="card-grid">
        {bookings.length ? (
          bookings.map((b) => (
            <article key={b._id} className="card">
              <span className={`status ${b.bookingStatus?.toLowerCase()}`}>{b.bookingStatus} · {b.paymentStatus || "Unpaid"}</span>
              <h3>{b.playground?.name || "Playground Booking"}</h3>
              <p>
                <strong>Date:</strong> {prettyDate(b.bookingDate)}<br />
                <strong>Time:</strong> {b.startTime} - {b.endTime}<br />
                <strong>Amount:</strong> {money(b.totalAmount || b.pricing)}
              </p>
              <div className="card-foot">
                <button
                  className="btn btn-primary"
                  onClick={() => { setActiveModal("view-ticket"); setModalData(b); }}
                >
                  View QR Ticket
                </button>
                {["Pending", "Confirmed"].includes(b.bookingStatus) && (
                  <button
                    className="btn btn-danger"
                    onClick={() => { setActiveModal("customer-cancel"); setModalData(b); }}
                  >
                    Cancel Slot
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="card"><p className="item-meta">You have no active or previous bookings.</p></div>
        )}
      </div>
    </div>
  );
}

// ===================================================
// SUB-TAB 3: PLAYGROUND ADMIN: VENUE MANAGEMENT
// ===================================================
function VenueManagementTab({ playgrounds, token, showNotice, reload, setActiveModal, setModalData }) {
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    try {
      await request(`/playgrounds/${id}`, { method: "DELETE", token });
      showNotice("Playground deleted successfully.");
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>My Playgrounds</h2>
          <p>Manage your registered venues, update details, pricing and photos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveModal("add-playground")}>+ Add Playground</button>
      </div>

      <div className="card-grid">
        {playgrounds.length ? (
          playgrounds.map((g) => (
            <article key={g._id} className="card">
              <span className={`status ${g.isApproved ? "confirmed" : "pending"}`}>
                {g.isApproved ? "Approved" : "Pending Review"} · {g.status || "Active"}
              </span>
              <h3>{g.name}</h3>
              <p>
                <strong>Sport:</strong> {g.sportType} · <strong>Capacity:</strong> {g.maxPlayers || "N/A"} players<br />
                <strong>Location:</strong> {g.address || `${g.area}, ${g.district}`}<br />
                <strong>Morning:</strong> {money(g.pricing?.morning)} · <strong>Evening:</strong> {money(g.pricing?.evening)}
              </p>
              <div className="card-foot">
                <button className="btn btn-alt" onClick={() => { setActiveModal("edit-playground"); setModalData(g); }}>Edit Details</button>
                <button className="btn btn-danger" onClick={() => handleDelete(g._id, g.name)}>Delete</button>
              </div>
            </article>
          ))
        ) : (
          <div className="card"><p className="item-meta">No venues added yet. Click &ldquo;Add Playground&rdquo; above to create your first venue listing.</p></div>
        )}
      </div>
    </div>
  );
}

// ===================================================
// SUB-TAB 4: SUPER ADMIN: PLAYGROUND APPROVAL CENTRE
// ===================================================
function SuperAdminPlaygroundsTab({ playgrounds, token, showNotice, reload, setActiveModal, setModalData }) {
  const handleAction = async (id, action) => {
    try {
      await request(`/playgrounds/${id}/${action}`, { method: "PATCH", token });
      showNotice(`Playground ${action}d successfully.`);
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const pending = playgrounds.filter((p) => !p.isApproved).length;
  const live = playgrounds.filter((p) => p.isApproved && p.status === "Active").length;

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Venue Governance & Approvals</h2>
          <p>Review new playground applications, grant public approvals and toggle listings.</p>
        </div>
      </div>

      <section className="stats">
        <article className="stat-card"><span>Pending Reviews</span><strong>{pending}</strong></article>
        <article className="stat-card"><span>Live Venues</span><strong>{live}</strong></article>
        <article className="stat-card"><span>Total Platform Grounds</span><strong>{playgrounds.length}</strong></article>
      </section>

      <div className="card-grid">
        {playgrounds.map((g) => (
          <article key={g._id} className="card">
            <span className={`status ${g.isApproved ? "confirmed" : "pending"}`}>
              {g.isApproved ? "Approved" : "Pending Approval"} · {g.status}
            </span>
            <h3>{g.name}</h3>
            <p>
              <strong>Owner:</strong> {g.playgroundAdmin?.name || "Admin"} ({g.playgroundAdmin?.email})<br />
              <strong>Location:</strong> {g.address || `${g.area}, ${g.district}`}<br />
              <strong>Sport:</strong> {g.sportType} · <strong>Hours:</strong> {g.openingTime} - {g.closingTime}
            </p>
            <div className="card-foot">
              <button className="btn btn-alt" onClick={() => { setActiveModal("view-ground"); setModalData(g); }}>View Details</button>
              {!g.isApproved && (
                <button className="btn btn-primary" onClick={() => handleAction(g._id, "approve")}>Approve</button>
              )}
              <button
                className="btn btn-alt"
                onClick={() => handleAction(g._id, g.status === "Active" ? "deactivate" : "activate")}
              >
                {g.status === "Active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ===================================================
// SUB-TAB 5: SLOTS MANAGEMENT (PLAYGROUND ADMIN)
// ===================================================
function SlotsManagementTab({
  playgrounds, slotsList, slotDate, setSlotDate, token, showNotice, reload, setActiveModal, setModalData
}) {
  const selectedDateObj = new Date(slotDate + "T12:00:00");
  const dayOfWeek = selectedDateObj.getDay();

  const handleToggleDateAvailability = async (slotId, makeAvailable) => {
    try {
      await request(`/slots/${slotId}/date-availability`, {
        method: "PATCH",
        body: { date: slotDate, available: makeAvailable },
        token
      });
      showNotice(makeAvailable ? "Slot opened for this date." : "Slot blocked for this date.");
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Remove this recurring weekly slot? Customers will no longer be able to book this time.")) return;
    try {
      await request(`/slots/${slotId}`, { method: "DELETE", token });
      showNotice("Slot deleted successfully.");
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <div>
      <div className="daily-schedule-toolbar">
        <div>
          <h2>Daily Slot Availability & Schedules</h2>
          <p>Review real-time slot bookings by date, or block individual recurring slots for holidays.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label>
            <span>Date:</span>
            <input type="date" value={slotDate} min={isoDate()} onChange={(e) => setSlotDate(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={() => setActiveModal("add-slots")}>+ Generate Slots</button>
        </div>
      </div>

      {slotsList.length ? (
        slotsList.map(({ ground, slots, bookings }) => {
          const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek && s.isActive);
          const bookingsForDay = bookings.filter((b) => String(b.bookingDate).slice(0, 10) === slotDate && ["Pending", "Confirmed"].includes(b.bookingStatus));

          return (
            <section key={ground._id} className="daily-venue">
              <header>
                <div>
                  <span className="dash-eyebrow">VENUE SCHEDULE</span>
                  <h2>{ground.name}</h2>
                  <p className="item-meta">{ground.address || "Address pending"}</p>
                </div>
                <strong>{bookingsForDay.length} Booked / {daySlots.length} Active Slots</strong>
              </header>

              <div className="daily-slot-grid">
                {daySlots.length ? (
                  daySlots.map((slot) => {
                    const booking = bookingsForDay.find((b) => b.startTime === slot.startTime && b.endTime === slot.endTime);
                    const isUnavailable = (slot.unavailableDates || []).includes(slotDate);

                    if (booking) {
                      return (
                        <article key={slot._id} className="daily-slot booked">
                          <div>
                            <strong>{slot.startTime} - {slot.endTime}</strong>
                            <small>{booking.customer?.name || "Customer"} · {booking.bookingStatus}</small>
                          </div>
                          <span className="status cancelled">Booked</span>
                        </article>
                      );
                    }
                    if (isUnavailable) {
                      return (
                        <article key={slot._id} className="daily-slot unavailable">
                          <div>
                            <strong>{slot.startTime} - {slot.endTime}</strong>
                            <small>Blocked for this day</small>
                          </div>
                          <button
                            className="btn btn-alt"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => handleToggleDateAvailability(slot._id, true)}
                          >
                            Open
                          </button>
                        </article>
                      );
                    }
                    return (
                      <article key={slot._id} className="daily-slot available">
                        <div>
                          <strong>{slot.startTime} - {slot.endTime}</strong>
                          <small>{slot.price ? money(slot.price) : "Open for booking"}</small>
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            className="btn btn-alt"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => handleToggleDateAvailability(slot._id, false)}
                          >
                            Block
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => handleDeleteSlot(slot._id)}
                            title="Delete recurring slot"
                          >
                            ×
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="item-meta">No active slots scheduled for this day of the week. Click &ldquo;+ Generate Slots&rdquo; above.</p>
                )}
              </div>
            </section>
          );
        })
      ) : (
        <div className="card"><p className="item-meta">Add a playground first before managing slot schedules.</p></div>
      )}
    </div>
  );
}

// ===================================================
// SUB-TAB 6: ADMIN BOOKINGS (with Reason & Refund Cancel)
// ===================================================
function AdminBookingsTab({ bookings, token, showNotice, reload, setActiveModal, setModalData }) {
  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Venue Booking Management</h2>
          <p>Review customer reservations and process administrative cancellations with instant refund.</p>
        </div>
      </div>

      <div className="card-grid">
        {bookings.length ? (
          bookings.map((b) => (
            <article key={b._id} className="card">
              <span className={`status ${b.bookingStatus?.toLowerCase()}`}>
                {b.bookingStatus} · {b.paymentStatus || "Unpaid"}
              </span>
              <h3>{b.playground?.name || "Playground Booking"}</h3>
              <p>
                <strong>Customer:</strong> {b.customer?.name || "Customer"} ({b.customer?.phone || b.customer?.email})<br />
                <strong>Date & Time:</strong> {prettyDate(b.bookingDate)} · {b.startTime} - {b.endTime}<br />
                <strong>Amount:</strong> {money(b.totalAmount || b.pricing)}
                {b.cancellationReason && (
                  <><br /><strong style={{ color: "#b91c1c" }}>Cancelled Reason:</strong> {b.cancellationReason}</>
                )}
              </p>
              <div className="card-foot">
                {["Pending", "Confirmed"].includes(b.bookingStatus) && (
                  <button
                    className="btn btn-danger"
                    onClick={() => { setActiveModal("admin-cancel"); setModalData(b); }}
                  >
                    Cancel Booking & Refund
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="card"><p className="item-meta">No bookings placed for your venues yet.</p></div>
        )}
      </div>
    </div>
  );
}

// ===================================================
// SUB-TAB 7: QR SCANNER (PLAYGROUND ADMIN)
// ===================================================
function QRScannerTab({ token, showNotice }) {
  const [ticketInput, setTicketInput] = useState("");
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleValidate = async (e) => {
    e?.preventDefault();
    if (!ticketInput.trim()) return;
    setVerifying(true);
    setResult(null);
    try {
      const data = await request("/payments/validate-qr", {
        method: "POST",
        body: { token: ticketInput.trim() },
        token
      });
      setResult({ success: true, message: data.message || "Ticket validated successfully!", data });
      showNotice("Ticket verified: Valid reservation.");
    } catch (err) {
      setResult({ success: false, message: err.message || "Invalid or expired QR ticket." });
      showNotice(err.message, "error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto" }}>
      <article className="qr-scanner-card">
        <span className="dash-eyebrow">ENTRY VALIDATION</span>
        <h2>Venue Check-in QR Scanner</h2>
        <p className="item-meta">Paste the QR ticket string or ticket ID to verify match and ground access eligibility.</p>

        <form onSubmit={handleValidate} className="qr-scanner-input">
          <input
            type="text"
            placeholder="Scan or enter QR ticket code..."
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={verifying}>
            {verifying ? "Checking..." : "Verify"}
          </button>
        </form>

        {result && (
          <div className={`scanner-result ${result.success ? "success" : "error"}`}>
            <strong>{result.success ? "✓ Entry Granted" : "✕ Validation Failed"}</strong>
            <p>{result.message}</p>
            {result.data?.booking && (
              <div style={{ marginTop: "8px", fontSize: "0.85rem" }}>
                <strong>Customer:</strong> {result.data.booking.customer?.name}<br />
                <strong>Time Slot:</strong> {result.data.booking.startTime} - {result.data.booking.endTime}
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

// ===================================================
// SUB-TAB 8: INCOME & REFUNDS (PLAYGROUND ADMIN)
// ===================================================
function IncomeTab({ incomeData, token, showNotice, reload }) {
  const handleCompleteRefund = async (paymentId) => {
    if (!window.confirm("Mark this refund as paid to the customer in cash at the venue office?")) return;
    try {
      await request(`/payments/refund/${paymentId}/complete`, { method: "PATCH", token });
      showNotice("Refund completed and customer notified.");
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <div className="income-dashboard">
      <div className="section-heading">
        <div>
          <h2>Income Overview & Office Refunds</h2>
          <p>Review paid earnings from your playgrounds and confirm office cash refunds.</p>
        </div>
      </div>

      <div className="income-stat-grid">
        <article>
          <div>
            <span>Slot Booking Earnings</span>
            <strong>{money(incomeData?.slotTotal)}</strong>
          </div>
        </article>
        <article>
          <div>
            <span>Tournament Income</span>
            <strong>{money(incomeData?.tournamentTotal)}</strong>
          </div>
        </article>
        <article className="income-grand-total">
          <div>
            <span>Total Collected</span>
            <strong>{money(incomeData?.total)}</strong>
          </div>
        </article>
      </div>

      {/* Pending Office Refunds Section */}
      <section className="panel" style={{ marginBottom: "24px" }}>
        <h2 className="panel-title">Office Refund Collection Desk</h2>
        <p className="item-meta" style={{ marginBottom: "12px" }}>Confirm only after the customer receives their refund at the venue office.</p>
        <div className="list">
          {incomeData?.pendingRefunds?.length ? (
            incomeData.pendingRefunds.map((ref) => (
              <div key={ref.paymentId} className="list-row">
                <div>
                  <div className="item-title">{ref.customer} · {money(ref.amount)}</div>
                  <p className="item-meta">{ref.playground} · Ref: {ref.reference}</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleCompleteRefund(ref.paymentId)}>
                  Mark Refund Successful
                </button>
              </div>
            ))
          ) : (
            <p className="item-meta">No refunds waiting for office collection.</p>
          )}
        </div>
      </section>

      {/* Income Breakdown Lists */}
      <section className="split-grid">
        <article className="panel">
          <h2 className="panel-title">Recent Paid Slots</h2>
          <div className="list">
            {incomeData?.slots?.length ? (
              incomeData.slots.slice(0, 6).map((item, idx) => (
                <div key={idx} className="list-row">
                  <div>
                    <div className="item-title">{item.playground}</div>
                    <p className="item-meta">{prettyDate(item.date)} · {item.startTime} - {item.endTime}</p>
                  </div>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))
            ) : (
              <p className="item-meta">No paid slot bookings recorded yet.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <h2 className="panel-title">Tournament Registrations</h2>
          <div className="list">
            {incomeData?.tournaments?.length ? (
              incomeData.tournaments.slice(0, 6).map((item, idx) => (
                <div key={idx} className="list-row">
                  <div>
                    <div className="item-title">{item.tournament}</div>
                    <p className="item-meta">{item.team} · {item.playground}</p>
                  </div>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))
            ) : (
              <p className="item-meta">No paid tournament team entries yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

// ===================================================
// SUB-TAB 9: USER CONTROL (SUPER ADMIN)
// ===================================================
function UserControlTab({ users, token, showNotice, reload }) {
  const [filterRole, setFilterRole] = useState("all");

  const handleToggleBlock = async (id, isBlocked) => {
    try {
      await request(`/users/${isBlocked ? "unblock" : "block"}/${id}`, {
        method: "PATCH",
        token
      });
      showNotice(isBlocked ? "User unblocked successfully." : "User blocked.");
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const filteredUsers = filterRole === "all" ? users : users.filter((u) => u.role === filterRole);

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>User Control Centre</h2>
          <p>Oversee registered customer accounts, playground administrators, and permissions.</p>
        </div>
        <div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px" }}>
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="playground-admin">Playground Admins</option>
            <option value="super-admin">Super Admins</option>
          </select>
        </div>
      </div>

      <div className="card-grid">
        {filteredUsers.map((u) => (
          <article key={u._id} className="card">
            <span className={`status ${u.isBlocked ? "cancelled" : "confirmed"}`}>
              {u.role} · {u.isBlocked ? "Blocked" : "Active"}
            </span>
            <h3>{u.name}</h3>
            <p>
              <strong>Email:</strong> {u.email}<br />
              <strong>Phone:</strong> {u.phone || "Not added"}<br />
              <strong>Joined:</strong> {prettyDate(u.createdAt)}
            </p>
            <div className="card-foot">
              {u.role !== "super-admin" && (
                <button
                  className={`btn ${u.isBlocked ? "btn-primary" : "btn-danger"}`}
                  onClick={() => handleToggleBlock(u._id, u.isBlocked)}
                >
                  {u.isBlocked ? "Unblock Account" : "Block Account"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ===================================================
// SUB-TAB 10: REPORTS TAB (Role-Adaptive)
// ===================================================
function ReportsTab({
  role, myReports, allReports, playgrounds, reportableCustomers, token, showNotice, reload
}) {
  // Super Admin Decision State
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [adminNotes, setAdminNotes] = useState({});
  const [decisionStatuses, setDecisionStatuses] = useState({});

  // New Report Form State
  const [formState, setFormState] = useState({
    playground: "", customerRecord: "", category: "Safety", severity: "Medium", subject: "", message: ""
  });

  const handleCreateReport = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        targetType: role === "playground-admin" ? "User" : "Playground",
        category: formState.category,
        severity: formState.severity,
        subject: formState.subject,
        message: formState.message
      };
      if (role === "playground-admin") {
        const [reportedUser, playground] = formState.customerRecord.split("|");
        payload.reportedUser = reportedUser;
        payload.playground = playground;
      } else {
        payload.playground = formState.playground;
      }
      await request("/reports", { method: "POST", body: payload, token });
      showNotice("Report submitted successfully for super admin review.");
      setFormState({ playground: "", customerRecord: "", category: "Safety", severity: "Medium", subject: "", message: "" });
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleSaveDecision = async (reportId) => {
    const status = decisionStatuses[reportId] || "Resolved";
    const note = adminNotes[reportId] || "";
    try {
      await request(`/reports/${reportId}/status`, {
        method: "PATCH",
        body: { status, adminNote: note },
        token
      });
      showNotice("Decision saved and reporter notified.");
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  if (role === "super-admin") {
    const filteredReports = selectedStatus === "All" ? allReports : allReports.filter((r) => r.status === selectedStatus);
    return (
      <div className="report-workspace">
        <div className="report-hero">
          <div>
            <h2>Report Review Queue</h2>
            <p>Prioritise incoming issues, document resolution decisions and update reporters.</p>
          </div>
          <div className="report-stats">
            <div className="report-stat"><strong>{allReports.length}</strong><span>Total</span></div>
            <div className="report-stat"><strong>{allReports.filter((r) => ["Pending", "Under Review"].includes(r.status)).length}</strong><span>Open</span></div>
            <div className="report-stat"><strong>{allReports.filter((r) => r.status === "Resolved").length}</strong><span>Resolved</span></div>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{ padding: "8px 14px", borderRadius: "8px" }}>
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
        </div>

        <div className="card-grid">
          {filteredReports.map((r) => (
            <article key={r._id} className="card">
              <div className="report-card-top">
                <span className={`status ${r.status?.toLowerCase().replace(/\s+/g, "-")}`}>{r.status}</span>
                <span className="status cancelled">{r.severity} Priority</span>
              </div>
              <h3>{r.subject}</h3>
              <p>{r.message}</p>
              <p className="item-meta">
                <strong>Reporter:</strong> {r.reporter?.name} · <strong>Regarding:</strong> {r.playground?.name || r.reportedUser?.name}<br />
                <strong>Submitted:</strong> {prettyDate(r.createdAt)}
              </p>

              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <select
                  value={decisionStatuses[r._id] || r.status}
                  onChange={(e) => setDecisionStatuses({ ...decisionStatuses, [r._id]: e.target.value })}
                  style={{ padding: "6px 8px", borderRadius: "6px" }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
                <textarea
                  placeholder="Decision note for reporter..."
                  defaultValue={r.adminNote || ""}
                  onChange={(e) => setAdminNotes({ ...adminNotes, [r._id]: e.target.value })}
                  style={{ padding: "6px 8px", borderRadius: "6px", minHeight: "60px" }}
                />
                <button className="btn btn-primary" onClick={() => handleSaveDecision(r._id)}>
                  Save Decision & Notify
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="report-workspace">
      <div className="report-hero">
        <div>
          <h2>{role === "playground-admin" ? "Customer Report Centre" : "Issue Report Centre"}</h2>
          <p>{role === "playground-admin" ? "Report booking misconduct or property damage for booked customers." : "Submit issue reports for venue maintenance, cleanliness or booking problems."}</p>
        </div>
      </div>

      <div className="report-layout">
        {/* Form Panel */}
        <article className="panel">
          <h2 className="panel-title">{role === "playground-admin" ? "Report a Customer" : "Submit Issue Report"}</h2>
          <form onSubmit={handleCreateReport} className="form-grid">
            {role === "playground-admin" ? (
              <label className="full">
                Choose Customer Booking
                <select
                  required
                  value={formState.customerRecord}
                  onChange={(e) => setFormState({ ...formState, customerRecord: e.target.value })}
                >
                  <option value="">Select a booked customer...</option>
                  {reportableCustomers.map((item) => (
                    <option key={`${item.customer._id}|${item.playground._id}`} value={`${item.customer._id}|${item.playground._id}`}>
                      {item.customer.name} — {item.playground.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="full">
                Choose Playground
                <select
                  required
                  value={formState.playground}
                  onChange={(e) => setFormState({ ...formState, playground: e.target.value })}
                >
                  <option value="">Select venue...</option>
                  {playgrounds.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Category
              <select value={formState.category} onChange={(e) => setFormState({ ...formState, category: e.target.value })}>
                <option>Cleanliness</option>
                <option>Maintenance</option>
                <option>Staff Behavior</option>
                <option>Safety</option>
                <option>Customer Misconduct</option>
                <option>Property Damage</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Severity
              <select value={formState.severity} onChange={(e) => setFormState({ ...formState, severity: e.target.value })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>

            <label className="full">
              Subject
              <input
                required
                placeholder="Brief summary..."
                value={formState.subject}
                onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
              />
            </label>

            <label className="full">
              Message
              <textarea
                required
                placeholder="Detailed explanation of what occurred..."
                value={formState.message}
                onChange={(e) => setFormState({ ...formState, message: e.target.value })}
              />
            </label>

            <div className="full">
              <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>Submit Report</button>
            </div>
          </form>
        </article>

        {/* My Report History */}
        <article className="panel">
          <h2 className="panel-title">My Submitted Reports</h2>
          <div className="list">
            {myReports.length ? (
              myReports.map((r) => (
                <div key={r._id} className="report-card">
                  <div className="report-card-top">
                    <span className={`status ${r.status?.toLowerCase().replace(/\s+/g, "-")}`}>{r.status}</span>
                    <span className="status cancelled">{r.severity}</span>
                  </div>
                  <h3>{r.subject}</h3>
                  <p>{r.message}</p>
                  {r.adminNote && (
                    <div className="report-review">
                      <strong>Admin Update:</strong> {r.adminNote}
                    </div>
                  )}
                  <p className="item-meta">{prettyDate(r.createdAt)} · Category: {r.category}</p>
                </div>
              ))
            ) : (
              <p className="item-meta">You haven&apos;t submitted any reports yet.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

// ===================================================
// SUB-TAB 11: ACCOUNT CENTRE / PROFILE
// ===================================================
function AccountCentreTab({ user, setUser, token, showNotice }) {
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    gender: user?.gender || "",
    dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "",
    address: user?.address || ""
  });

  // Password Change
  const [pwdState, setPwdState] = useState({ newPassword: "", confirmPassword: "", otp: "" });
  const [pwdOtpSent, setPwdOtpSent] = useState(false);

  // Email Change
  const [emailState, setEmailState] = useState({ newEmail: "", otp: "" });
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await request("/users/me", { method: "PUT", body: profileData, token });
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem("turf_user", JSON.stringify(merged));
      showNotice("Personal information saved successfully.");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("profileImage", file);
    try {
      const updated = await request("/users/me/profile-image", { method: "PUT", body: form, token });
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem("turf_user", JSON.stringify(merged));
      showNotice("Profile picture updated!");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleRequestPasswordOtp = async () => {
    try {
      await request("/auth/request-sensitive-otp", { method: "POST", body: { action: "password-change" }, token });
      setPwdOtpSent(true);
      showNotice("Security OTP sent to your registered email address.");
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    if (pwdState.newPassword !== pwdState.confirmPassword) {
      return showNotice("Passwords do not match.", "error");
    }
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
    if (!emailState.newEmail) return showNotice("Please enter a new email address.", "error");
    try {
      await request("/auth/request-sensitive-otp", {
        method: "POST",
        body: { action: "email-change", newEmail: emailState.newEmail },
        token
      });
      setEmailOtpSent(true);
      showNotice("Security OTP sent to your new email address.");
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
      showNotice("Email address updated successfully.");
      setEmailOtpSent(false);
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <div className="report-layout">
      {/* Profile Info Form */}
      <article className="panel">
        <h2 className="panel-title">Personal Information</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div className="avatar" style={{ width: "60px", height: "60px", fontSize: "1.4rem", backgroundImage: user.profileImage ? `url(${user.profileImage})` : "" }}>
            {!user.profileImage && (user.name?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <label className="btn btn-alt" style={{ cursor: "pointer", display: "inline-block" }}>
              Upload Photo
              <input type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
            </label>
            <p className="item-meta" style={{ marginTop: "4px" }}>PNG, JPG or WebP up to 5 MB</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="form-grid">
          <label className="full">
            Full Name
            <input
              required
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            />
          </label>
          <label>
            Phone Number
            <input
              placeholder="01XXXXXXXXX"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            />
          </label>
          <label>
            Gender
            <select
              value={profileData.gender}
              onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Date of Birth
            <input
              type="date"
              value={profileData.dateOfBirth}
              onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
            />
          </label>
          <label className="full">
            Address
            <input
              placeholder="House, road, area, district"
              value={profileData.address}
              onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
            />
          </label>
          <div className="full">
            <button className="btn btn-primary" type="submit">Save Changes</button>
          </div>
        </form>
      </article>

      {/* Security: Email & Password */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Change Password Panel */}
        <article className="panel">
          <h2 className="panel-title">Change Password</h2>
          <p className="item-meta">Request a security OTP to your email before resetting your password.</p>
          <form onSubmit={handleConfirmPasswordChange} className="form-grid" style={{ marginTop: "12px" }}>
            <div className="full" style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn btn-alt" onClick={handleRequestPasswordOtp}>
                {pwdOtpSent ? "Resend OTP" : "Send Password OTP"}
              </button>
            </div>
            {pwdOtpSent && (
              <>
                <label className="full">
                  Verification OTP
                  <input
                    required
                    placeholder="Enter 6-digit OTP"
                    value={pwdState.otp}
                    onChange={(e) => setPwdState({ ...pwdState, otp: e.target.value })}
                  />
                </label>
                <label>
                  New Password
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pwdState.newPassword}
                    onChange={(e) => setPwdState({ ...pwdState, newPassword: e.target.value })}
                  />
                </label>
                <label>
                  Confirm Password
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pwdState.confirmPassword}
                    onChange={(e) => setPwdState({ ...pwdState, confirmPassword: e.target.value })}
                  />
                </label>
                <div className="full">
                  <button className="btn btn-primary" type="submit">Update Password</button>
                </div>
              </>
            )}
          </form>
        </article>

        {/* Change Email Panel */}
        <article className="panel">
          <h2 className="panel-title">Change Email Address</h2>
          <p className="item-meta">Verify ownership of the new email with an OTP verification code.</p>
          <form onSubmit={handleConfirmEmailChange} className="form-grid" style={{ marginTop: "12px" }}>
            <label className="full">
              Current Email
              <input type="email" value={user.email} disabled />
            </label>
            <label className="full">
              New Email Address
              <input
                type="email"
                required
                placeholder="new.email@example.com"
                value={emailState.newEmail}
                onChange={(e) => setEmailState({ ...emailState, newEmail: e.target.value })}
              />
            </label>
            <div className="full">
              <button type="button" className="btn btn-alt" onClick={handleRequestEmailOtp}>
                {emailOtpSent ? "Resend Email OTP" : "Send Verification OTP"}
              </button>
            </div>
            {emailOtpSent && (
              <>
                <label className="full">
                  OTP Code
                  <input
                    required
                    placeholder="Enter 6-digit code sent to new email"
                    value={emailState.otp}
                    onChange={(e) => setEmailState({ ...emailState, otp: e.target.value })}
                  />
                </label>
                <div className="full">
                  <button className="btn btn-primary" type="submit">Confirm Email Change</button>
                </div>
              </>
            )}
          </form>
        </article>
      </div>
    </div>
  );
}

// ===================================================
// GLOBAL MODALS COMPONENT
// ===================================================
function Modals({ modal, data, close, token, showNotice, reload, playgrounds }) {
  // Playground Form State
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

  // Slots Bulk Generator State
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

  // Cancellation Reason State
  const [cancelReason, setCancelReason] = useState("");

  const handleSavePlayground = async (e) => {
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
        showNotice("Playground details updated successfully!");
      } else {
        await request("/playgrounds", { method: "POST", body: payload, token });
        showNotice("Playground submitted for review!");
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
    const formatMin = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

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
      if (hasBreak && cur < bEnd && cur + dur > bStart) {
        cur = bEnd;
      }
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
      showNotice(`Successfully generated ${payload.slots.length} slots!`);
      close();
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleCustomerCancelBooking = async () => {
    try {
      await request(`/bookings/${data._id}/cancel`, { method: "PATCH", token });
      showNotice("Booking cancelled successfully.");
      close();
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  const handleAdminCancelBooking = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return showNotice("Please provide a reason for the customer.", "error");
    try {
      await request(`/bookings/${data._id}/admin-cancel`, {
        method: "PATCH",
        body: { reason: cancelReason.trim() },
        token
      });
      showNotice("Booking cancelled and customer notified with refund.");
      close();
      reload();
    } catch (err) {
      showNotice(err.message, "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>×</button>

        {/* 1. Add / Edit Playground Modal */}
        {(modal === "add-playground" || modal === "edit-playground") && (
          <div>
            <span className="dash-eyebrow">VENUE SETUP</span>
            <h2>{isEdit ? `Edit ${data.name}` : "Register New Playground"}</h2>
            <p className="meta">Provide accurate pricing, sport specifications and contact information.</p>
            <form onSubmit={handleSavePlayground} className="form-grid">
              <label className="full">
                Playground Name
                <input required value={groundForm.name} onChange={(e) => setGroundForm({ ...groundForm, name: e.target.value })} />
              </label>
              <label>
                Sport Type
                <select value={groundForm.sportType} onChange={(e) => setGroundForm({ ...groundForm, sportType: e.target.value })}>
                  <option>Football</option>
                  <option>Cricket</option>
                  <option>Badminton</option>
                </select>
              </label>
              <label>
                Max Players
                <input type="number" min={1} required value={groundForm.maxPlayers} onChange={(e) => setGroundForm({ ...groundForm, maxPlayers: e.target.value })} />
              </label>
              <label className="full">
                Description
                <textarea required value={groundForm.description} onChange={(e) => setGroundForm({ ...groundForm, description: e.target.value })} />
              </label>
              <label>
                Phone
                <input required value={groundForm.phone} onChange={(e) => setGroundForm({ ...groundForm, phone: e.target.value })} />
              </label>
              <label>
                Email
                <input type="email" required value={groundForm.email} onChange={(e) => setGroundForm({ ...groundForm, email: e.target.value })} />
              </label>
              <label className="full">
                Address
                <input required value={groundForm.address} onChange={(e) => setGroundForm({ ...groundForm, address: e.target.value })} />
              </label>
              <label>
                Area
                <input required value={groundForm.area} onChange={(e) => setGroundForm({ ...groundForm, area: e.target.value })} />
              </label>
              <label>
                District
                <input required value={groundForm.district} onChange={(e) => setGroundForm({ ...groundForm, district: e.target.value })} />
              </label>
              <label>
                Opening Time
                <input type="time" required value={groundForm.openingTime} onChange={(e) => setGroundForm({ ...groundForm, openingTime: e.target.value })} />
              </label>
              <label>
                Closing Time
                <input type="time" required value={groundForm.closingTime} onChange={(e) => setGroundForm({ ...groundForm, closingTime: e.target.value })} />
              </label>
              <label>
                Morning Price (BDT)
                <input type="number" min={0} required value={groundForm.morningPrice} onChange={(e) => setGroundForm({ ...groundForm, morningPrice: e.target.value })} />
              </label>
              <label>
                Evening Price (BDT)
                <input type="number" min={0} required value={groundForm.eveningPrice} onChange={(e) => setGroundForm({ ...groundForm, eveningPrice: e.target.value })} />
              </label>
              <label className="full">
                Facilities (comma separated)
                <input value={groundForm.facilities} onChange={(e) => setGroundForm({ ...groundForm, facilities: e.target.value })} />
              </label>
              <div className="full" style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button className="btn btn-alt" type="button" onClick={close}>Cancel</button>
                <button className="btn btn-primary" type="submit">Save Playground</button>
              </div>
            </form>
          </div>
        )}

        {/* 2. Generate Slots Modal */}
        {modal === "add-slots" && (
          <div>
            <span className="dash-eyebrow">AUTOMATED SCHEDULE</span>
            <h2>Generate Weekly Slots</h2>
            <p className="meta">Configure your venue schedule, slot duration, and break times.</p>
            <form onSubmit={handleGenerateSlots} className="form-grid">
              <label className="full">
                Select Playground
                <select required value={slotGen.playgroundId} onChange={(e) => setSlotGen({ ...slotGen, playgroundId: e.target.value })}>
                  {playgrounds.map((g) => (
                    <option key={g._id} value={g._id}>{g.name} ({g.sportType})</option>
                  ))}
                </select>
              </label>
              <label>
                Day Application
                <select value={slotGen.dayType} onChange={(e) => setSlotGen({ ...slotGen, dayType: e.target.value })}>
                  <option value="everyday">Everyday (All 7 Days)</option>
                  <option value="weekdays">Weekdays (Sun - Thu)</option>
                  <option value="weekend">Weekend (Fri - Sat)</option>
                </select>
              </label>
              <label>
                Slot Duration (Minutes)
                <select value={slotGen.durationMinutes} onChange={(e) => setSlotGen({ ...slotGen, durationMinutes: e.target.value })}>
                  <option value={60}>60 Minutes</option>
                  <option value={90}>90 Minutes</option>
                  <option value={120}>120 Minutes</option>
                </select>
              </label>
              <label>
                Opening Time
                <input type="time" required value={slotGen.openingTime} onChange={(e) => setSlotGen({ ...slotGen, openingTime: e.target.value })} />
              </label>
              <label>
                Closing Time
                <input type="time" required value={slotGen.closingTime} onChange={(e) => setSlotGen({ ...slotGen, closingTime: e.target.value })} />
              </label>
              <label>
                Break Start (Optional)
                <input type="time" value={slotGen.breakStartTime} onChange={(e) => setSlotGen({ ...slotGen, breakStartTime: e.target.value })} />
              </label>
              <label>
                Break End (Optional)
                <input type="time" value={slotGen.breakEndTime} onChange={(e) => setSlotGen({ ...slotGen, breakEndTime: e.target.value })} />
              </label>
              <label className="full">
                Maximum Slots Per Day
                <input type="number" min={1} max={24} value={slotGen.slotsPerDay} onChange={(e) => setSlotGen({ ...slotGen, slotsPerDay: e.target.value })} />
              </label>
              <div className="full" style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button className="btn btn-alt" type="button" onClick={close}>Cancel</button>
                <button className="btn btn-primary" type="submit">Create Slots</button>
              </div>
            </form>
          </div>
        )}

        {/* 3. View QR Ticket Modal */}
        {modal === "view-ticket" && data && (
          <div style={{ textAlign: "center" }}>
            <span className="dash-eyebrow">DIGITAL PASS</span>
            <h2>{data.playground?.name || "TURF Entry Pass"}</h2>
            <p className="meta">{prettyDate(data.bookingDate)} · {data.startTime} - {data.endTime}</p>

            <div style={{ margin: "20px auto", padding: "16px", background: "#f8fafc", borderRadius: "14px", display: "inline-block" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data._id)}`}
                alt="Booking QR Code"
                style={{ width: "200px", height: "200px", display: "block" }}
              />
              <span style={{ display: "block", marginTop: "10px", fontSize: "0.8rem", color: "#64748b", fontWeight: 700 }}>
                Pass ID: {data._id}
              </span>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Show this QR code at the venue reception scanner for seamless entry verification.
            </p>

            <div style={{ marginTop: "18px" }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print Ticket</button>
            </div>
          </div>
        )}

        {/* 4. Customer Cancel Modal */}
        {modal === "customer-cancel" && data && (
          <div>
            <span className="dash-eyebrow" style={{ color: "#b91c1c" }}>CANCELLATION NOTICE</span>
            <h2>Cancel this reservation?</h2>
            <p className="meta">
              Playground: <strong>{data.playground?.name}</strong><br />
              Schedule: <strong>{prettyDate(data.bookingDate)} · {data.startTime} - {data.endTime}</strong>
            </p>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Are you sure you wish to cancel this slot? Any eligible refund will be routed according to our venue cancellation policy.
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button className="btn btn-alt" onClick={close}>Keep Booking</button>
              <button className="btn btn-danger" onClick={handleCustomerCancelBooking}>Confirm & Cancel</button>
            </div>
          </div>
        )}

        {/* 5. Admin Cancel Modal */}
        {modal === "admin-cancel" && data && (
          <div>
            <span className="dash-eyebrow" style={{ color: "#b91c1c" }}>VENUE ACTION</span>
            <h2>Cancel & Refund Customer Slot</h2>
            <p className="meta">
              Customer: <strong>{data.customer?.name}</strong> · Venue: <strong>{data.playground?.name}</strong><br />
              Time: {prettyDate(data.bookingDate)} · {data.startTime} - {data.endTime}
            </p>
            <form onSubmit={handleAdminCancelBooking} className="form-grid">
              <label className="full">
                Reason for cancellation (Shared with customer)
                <textarea
                  required
                  placeholder="E.g., Field unavailable due to urgent turf maintenance or inclement weather..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </label>
              <div className="full" style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button className="btn btn-alt" type="button" onClick={close}>Keep Booking</button>
                <button className="btn btn-danger" type="submit">Cancel, Refund & Notify</button>
              </div>
            </form>
          </div>
        )}

        {/* 6. View Ground Details Modal (Super Admin) */}
        {modal === "view-ground" && data && (
          <div>
            <span className="dash-eyebrow">{data.sportType}</span>
            <h2>{data.name}</h2>
            <p className="meta">{data.address || `${data.area}, ${data.district}`}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "14px 0", fontSize: "0.85rem" }}>
              <div><strong>Owner:</strong> {data.playgroundAdmin?.name || "Admin"}</div>
              <div><strong>Contact:</strong> {data.phone} / {data.email}</div>
              <div><strong>Capacity:</strong> {data.maxPlayers} players</div>
              <div><strong>Hours:</strong> {data.openingTime} - {data.closingTime}</div>
              <div><strong>Morning Price:</strong> {money(data.pricing?.morning)}</div>
              <div><strong>Evening Price:</strong> {money(data.pricing?.evening)}</div>
            </div>
            <p><strong>Description:</strong> {data.description || "No description provided."}</p>
            <p className="item-meta"><strong>Facilities:</strong> {(data.facilities || []).join(", ") || "None listed"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
