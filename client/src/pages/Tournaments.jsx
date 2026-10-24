import { useEffect, useState } from "react";
import "./Tournaments.css";
import { API, money, prettyDate, isoDate, request } from "../services/api";

export default function Tournaments({ token, user, openAuth, navigate, showNotice }) {
  const [tournaments, setTournaments] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("explore"); // explore | fixtures | my-teams
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [tournamentStandings, setTournamentStandings] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);

  // Modals
  const [activeModal, setActiveModal] = useState(null); // join | create
  const [modalData, setModalData] = useState(null);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  // Forms
  const [joinForm, setJoinForm] = useState({
    teamName: "",
    captainName: user?.name || "",
    captainPhone: user?.phone || "",
    paymentMethod: "bKash"
  });

  const [createForm, setCreateForm] = useState({
    name: "",
    sportType: "Football",
    playground: "",
    totalTeams: 8,
    groupCount: 2,
    playingMembers: 5,
    extraMembers: 2,
    registrationFee: 1500,
    startDate: isoDate(new Date(Date.now() + 86400000 * 7)),
    endDate: isoDate(new Date(Date.now() + 86400000 * 9)),
    description: "Standard tournament with FIFA group stage and knockouts."
  });

  const role = user?.role || "customer";
  const canCreate = role === "playground-admin" || role === "super-admin";

  const loadData = async () => {
    setLoading(true);
    try {
      const [allT, allV] = await Promise.all([
        request("/tournaments", { token }).catch(() => []),
        request("/playgrounds").catch(() => [])
      ]);
      setTournaments(allT || []);
      setVenues(allV || []);
      if (allV?.length && !createForm.playground) {
        setCreateForm((prev) => ({ ...prev, playground: allV[0]._id }));
      }

      if (token && user?.role === "customer") {
        const myRegs = await request("/tournaments/my-registrations", { token }).catch(() => []);
        setMyRegistrations(myRegs || []);
      }
    } catch (err) {
      if (showNotice) showNotice(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const loadFixtures = async (t) => {
    setSelectedTournament(t);
    setActiveTab("fixtures");
    try {
      const [matches, standings] = await Promise.all([
        request(`/tournaments/${t._id}/matches`, { token }).catch(() => []),
        request(`/tournaments/${t._id}/standings`, { token }).catch(() => [])
      ]);
      setTournamentMatches(matches || []);
      setTournamentStandings(standings || []);
    } catch (err) {
      if (showNotice) showNotice(err.message, "error");
    }
  };

  const handleJoinClick = (t) => {
    if (!user || !token) {
      openAuth();
      return;
    }
    if (user.role !== "customer") {
      showNotice("Only customer accounts can register teams in tournaments.", "error");
      return;
    }
    setModalData(t);
    setJoinForm({
      teamName: "",
      captainName: user?.name || "",
      captainPhone: user?.phone || "",
      paymentMethod: "bKash"
    });
    setActiveModal("join");
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinForm.teamName.trim()) {
      showNotice("Please enter your team name.", "error");
      return;
    }
    setJoining(true);
    try {
      const formData = new FormData();
      formData.append("teamName", joinForm.teamName.trim());
      formData.append("captainName", joinForm.captainName.trim());
      formData.append("captainPhone", joinForm.captainPhone.trim());
      formData.append("paymentMethod", joinForm.paymentMethod);

      await request(`/tournaments/${modalData._id}/register`, {
        method: "POST",
        body: formData,
        token
      });

      showNotice(`Team ${joinForm.teamName} registered successfully! View your ticket in dashboard.`);
      setActiveModal(null);
      loadData();
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      setJoining(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await request("/tournaments", {
        method: "POST",
        body: {
          name: createForm.name.trim(),
          sportType: createForm.sportType,
          playgrounds: [createForm.playground],
          totalTeams: Number(createForm.totalTeams),
          groupCount: Number(createForm.groupCount),
          playingMembers: Number(createForm.playingMembers),
          extraMembers: Number(createForm.extraMembers),
          registrationFee: Number(createForm.registrationFee),
          startDate: createForm.startDate,
          endDate: createForm.endDate,
          description: createForm.description.trim()
        },
        token
      });
      showNotice("Tournament published successfully!");
      setActiveModal(null);
      loadData();
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const filteredTournaments = sportFilter === "All"
    ? tournaments
    : tournaments.filter((t) => t.sportType?.toLowerCase() === sportFilter.toLowerCase());

  return (
    <main className="tournament-hub">
      {/* Header Banner */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">CHAMPIONSHIP HUB</p>
          <h1 className="page-title">Tournaments &amp; Leagues</h1>
          <p className="muted">Compete in FIFA-format group stages, check live scores, and rise to the top.</p>
        </div>
        {canCreate && (
          <button className="primary" onClick={() => setActiveModal("create")}>
            + Host Tournament
          </button>
        )}
      </div>

      {/* Hero Stats */}
      <div className="tournament-hero-stats">
        <div className="tournament-stat-box">
          <div className="tournament-stat-icon">🏆</div>
          <div>
            <strong>{tournaments.length}</strong>
            <span>Active Competitions</span>
          </div>
        </div>
        <div className="tournament-stat-box">
          <div className="tournament-stat-icon">⚽</div>
          <div>
            <strong>{tournaments.filter((t) => t.sportType === "Football").length}</strong>
            <span>Football Cups</span>
          </div>
        </div>
        <div className="tournament-stat-box">
          <div className="tournament-stat-icon">🏏</div>
          <div>
            <strong>{tournaments.filter((t) => t.sportType === "Cricket").length}</strong>
            <span>Cricket Leagues</span>
          </div>
        </div>
        <div className="tournament-stat-box">
          <div className="tournament-stat-icon">🏸</div>
          <div>
            <strong>{tournaments.filter((t) => t.sportType === "Badminton").length}</strong>
            <span>Badminton Opens</span>
          </div>
        </div>
      </div>

      {/* Toolbar / Tabs */}
      <div className="tournament-toolbar">
        <div className="tabs" style={{ margin: 0, padding: 0 }}>
          <button
            className={activeTab === "explore" ? "active" : ""}
            onClick={() => setActiveTab("explore")}
          >
            Explore Tournaments
          </button>
          <button
            className={activeTab === "fixtures" ? "active" : ""}
            onClick={() => {
              if (tournaments.length && !selectedTournament) {
                loadFixtures(tournaments[0]);
              } else {
                setActiveTab("fixtures");
              }
            }}
          >
            Fixtures &amp; Standings
          </button>
          {user?.role === "customer" && (
            <button
              className={activeTab === "my-teams" ? "active" : ""}
              onClick={() => setActiveTab("my-teams")}
            >
              My Registered Teams ({myRegistrations.length})
            </button>
          )}
        </div>

        {activeTab === "explore" && (
          <div className="tournament-filter-pills">
            {["All", "Football", "Cricket", "Badminton"].map((sport) => (
              <button
                key={sport}
                className={sportFilter === sport ? "active" : ""}
                onClick={() => setSportFilter(sport)}
              >
                {sport === "All" ? "All Sports" : sport}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: EXPLORE TOURNAMENTS */}
      {activeTab === "explore" && (
        <>
          {loading ? (
            <div className="empty">Loading competitions…</div>
          ) : filteredTournaments.length ? (
            <div className="tournament-main-grid">
              {filteredTournaments.map((t) => {
                const sportClass = (t.sportType || "football").toLowerCase();
                const venueName = t.playgrounds?.[0]?.name || t.playground?.name || "Venue to be announced";
                const total = t.totalTeams || 8;
                const joined = t.teamsCount || t.teams?.length || 0;
                const progressPct = Math.min(100, Math.round((joined / total) * 100));

                return (
                  <article key={t._id} className="tournament-item-card">
                    <div className="tournament-card-header">
                      <span className={`sport-badge ${sportClass}`}>
                        {t.sportType === "Football" && "⚽ "}
                        {t.sportType === "Cricket" && "🏏 "}
                        {t.sportType === "Badminton" && "🏸 "}
                        {t.sportType || "Sports"}
                      </span>
                      <span className="tournament-status-pill">{t.status || "Upcoming"}</span>
                    </div>

                    <div className="tournament-card-body">
                      <h3>{t.name}</h3>
                      <div className="tournament-venue-label">
                        <span>📍</span> {venueName}
                      </div>

                      <div className="tournament-details-row">
                        <div>
                          <span>Start Date</span>
                          <strong>{prettyDate(t.startDate)}</strong>
                        </div>
                        <div>
                          <span>End Date</span>
                          <strong>{prettyDate(t.endDate)}</strong>
                        </div>
                      </div>

                      <div className="tournament-details-row">
                        <div>
                          <span>Entry Fee</span>
                          <strong style={{ color: "#0d5c29" }}>{money(t.registrationFee)}</strong>
                        </div>
                        <div>
                          <span>Format</span>
                          <strong>{t.groupCount || 2} Groups · FIFA</strong>
                        </div>
                      </div>

                      <div className="tournament-capacity-wrap">
                        <div className="capacity-labels">
                          <span>Team Registration</span>
                          <strong>{joined} / {total} Teams</strong>
                        </div>
                        <div className="capacity-bar">
                          <div className="capacity-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="tournament-card-footer">
                      <button
                        type="button"
                        className="button alt"
                        onClick={() => loadFixtures(t)}
                      >
                        Fixtures &amp; Table
                      </button>
                      {t.status === "Completed" ? (
                        <button
                          type="button"
                          className="button alt"
                          style={{ borderColor: "#16a34a", color: "#15803d", background: "#f0fdf4", fontWeight: 700 }}
                          onClick={() => loadFixtures(t)}
                        >
                          🏆 Final Standings
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button"
                          onClick={() => handleJoinClick(t)}
                        >
                          Join Tournament
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty" style={{ padding: "60px 20px" }}>
              <h3>No tournaments found</h3>
              <p className="muted">No upcoming competitions matching this sport right now.</p>
            </div>
          )}
        </>
      )}

      {/* TAB 2: FIXTURES & STANDINGS */}
      {activeTab === "fixtures" && (
        <section className="standings-section">
          {selectedTournament ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span className="eyebrow">{selectedTournament.sportType?.toUpperCase()} LEAGUE TABLE</span>
                  <h2 style={{ margin: "4px 0 0", color: "#0f172a" }}>{selectedTournament.name}</h2>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={selectedTournament._id}
                    onChange={(e) => {
                      const t = tournaments.find((item) => item._id === e.target.value);
                      if (t) loadFixtures(t);
                    }}
                    style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #d1e7d7" }}
                  >
                    {tournaments.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                  <button className="button alt" onClick={() => setActiveTab("explore")}>← Back to list</button>
                </div>
              </div>

              {/* Group Standings */}
              {tournamentStandings.length > 0 ? (
                tournamentStandings.map((group, gIdx) => (
                  <div key={gIdx} className="standings-group">
                    <h3 className="standings-group-title">
                      <span>Group {group.groupName || String.fromCharCode(65 + gIdx)}</span>
                      <small style={{ fontSize: "0.75rem", color: "#64748b" }}>Top 2 advance to knockouts</small>
                    </h3>
                    <div className="standings-table-wrap">
                      <table className="standings-table">
                        <thead>
                          <tr>
                            <th>Pos</th>
                            <th className="left">Team</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>GD</th>
                            <th>PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(group.standings || []).map((row, rIdx) => (
                            <tr key={rIdx} className={`rank-${rIdx + 1}`}>
                              <td><span className="rank-badge">{rIdx + 1}</span></td>
                              <td className="left"><strong>{row.teamName || row.team?.teamName || "Team"}</strong></td>
                              <td>{row.played || 0}</td>
                              <td>{row.won || 0}</td>
                              <td>{row.drawn || 0}</td>
                              <td>{row.lost || 0}</td>
                              <td>{row.goalDifference || 0}</td>
                              <td><strong style={{ color: "#0d5c29" }}>{row.points || 0}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                <div className="standings-group" style={{ textAlign: "center", padding: "40px" }}>
                  <p className="muted">Group standings table will be generated when registrations close and the tournament draw takes place.</p>
                </div>
              )}

              {/* Matches & Fixtures */}
              <div style={{ marginTop: "32px" }}>
                <h3 style={{ fontSize: "1.25rem", color: "#0f172a", marginBottom: "14px" }}>Match Schedule &amp; Scores</h3>
                {tournamentMatches.length ? (
                  <div className="fixtures-grid">
                    {tournamentMatches.map((m) => {
                      const live = m.matchStatus === "Live";
                      const completed = m.matchStatus === "Completed";
                      return (
                        <div key={m._id} className="fixture-card">
                          <div className="fixture-meta">
                            <span>{prettyDate(m.matchDate)} · {m.startTime || "TBD"}</span>
                            <span className={`status ${live ? "live" : ""}`}>{live ? "LIVE NOW" : completed ? "FULL TIME" : "UP NEXT"}</span>
                          </div>
                          <div className="fixture-teams">
                            <span>{m.teamA?.teamName || "Team A"}</span>
                            <span className={`fixture-score ${live ? "live" : ""}`}>
                              {live || completed ? `${m.teamAScore || 0} - ${m.teamBScore || 0}` : "VS"}
                            </span>
                            <span>{m.teamB?.teamName || "Team B"}</span>
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "8px" }}>
                            {m.stage || "Group Match"} · Pitch #{m.pitchNumber || 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty" style={{ padding: "30px" }}>
                    <p className="muted">Match fixtures will be published right after the official draw.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty">Select a tournament to view standings and fixtures.</div>
          )}
        </section>
      )}

      {/* TAB 3: MY TEAMS (CUSTOMER) */}
      {activeTab === "my-teams" && (
        <section style={{ marginTop: "20px" }}>
          <div className="section-heading">
            <div>
              <h2>My Registered Tournament Teams</h2>
              <p>Keep track of your squad, confirmed fixtures and entry receipts.</p>
            </div>
          </div>

          {myRegistrations.length ? (
            <div className="tournament-main-grid">
              {myRegistrations.map((team) => (
                <article key={team._id} className="card" style={{ padding: "20px" }}>
                  <span className="badge">PAID REGISTRATION</span>
                  <h3 style={{ margin: "12px 0 6px" }}>{team.teamName}</h3>
                  <p style={{ fontSize: "0.84rem", color: "#64748b" }}>
                    <strong>Competition:</strong> {team.tournament?.name || "Tournament"}<br />
                    <strong>Captain:</strong> {team.captainName} ({team.captainPhone})<br />
                    <strong>Dates:</strong> {prettyDate(team.tournament?.startDate)} – {prettyDate(team.tournament?.endDate)}<br />
                    <strong>Entry Fee:</strong> {money(team.tournament?.registrationFee)}
                  </p>
                  <div className="card-foot" style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        const t = tournaments.find((item) => item._id === team.tournament?._id || item._id === team.tournament);
                        if (t) loadFixtures(t);
                        else showNotice("Fixture data is being prepared by the venue organiser.");
                      }}
                    >
                      View Fixture
                    </button>
                    {navigate && (
                      <button
                        type="button"
                        className="button alt"
                        onClick={() => navigate("dashboard")}
                      >
                        View QR Ticket
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: "50px 20px" }}>
              <h3>No teams registered yet</h3>
              <p className="muted">Join an open tournament above to register your squad and compete.</p>
              <button className="button" onClick={() => setActiveTab("explore")}>Explore tournaments</button>
            </div>
          )}
        </section>
      )}

      {/* MODAL 1: JOIN TOURNAMENT */}
      {activeModal === "join" && modalData && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <span className="eyebrow">TEAM ENTRY REGISTRATION</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "1.35rem" }}>Join {modalData.name}</h2>
                <p className="muted" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>
                  Entry fee: <strong>{money(modalData.registrationFee)}</strong> · {modalData.sportType}
                </p>
              </div>
              <button className="close" onClick={() => setActiveModal(null)}>✕</button>
            </header>

            <form onSubmit={handleJoinSubmit} className="form-grid">
              <label className="full">
                Team Name
                <input
                  required
                  placeholder="e.g. Dhaka Strikers FC"
                  value={joinForm.teamName}
                  onChange={(e) => setJoinForm({ ...joinForm, teamName: e.target.value })}
                />
              </label>

              <label>
                Captain Name
                <input
                  required
                  placeholder="Full name"
                  value={joinForm.captainName}
                  onChange={(e) => setJoinForm({ ...joinForm, captainName: e.target.value })}
                />
              </label>

              <label>
                Captain Phone
                <input
                  required
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={joinForm.captainPhone}
                  onChange={(e) => setJoinForm({ ...joinForm, captainPhone: e.target.value })}
                />
              </label>

              <label className="full">
                Payment Method
                <select
                  value={joinForm.paymentMethod}
                  onChange={(e) => setJoinForm({ ...joinForm, paymentMethod: e.target.value })}
                >
                  <option value="bKash">bKash (01700-000000 demo)</option>
                  <option value="nagad">Nagad (01800-000000 demo)</option>
                  <option value="rocket">Rocket (01900-000000 demo)</option>
                  <option value="card">Visa / Mastercard (Instant)</option>
                </select>
              </label>

              <div className="full" style={{ padding: "12px 14px", background: "#f0fbf3", border: "1px solid #c7e9d0", borderRadius: "10px", fontSize: "0.8rem", color: "#0d5c29" }}>
                ✓ Official signed QR entry pass will be generated immediately in your dashboard passes.
              </div>

              <div className="card-foot full" style={{ marginTop: "14px" }}>
                <button type="button" className="button alt" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="button" disabled={joining}>
                  {joining ? "Registering team…" : `Pay ${money(modalData.registrationFee)} & Register`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE TOURNAMENT (ADMIN) */}
      {activeModal === "create" && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <span className="eyebrow">ORGANISER DESK</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "1.35rem" }}>Create New Tournament</h2>
                <p className="muted" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>Publish an official competition with automatic FIFA group scheduling.</p>
              </div>
              <button className="close" onClick={() => setActiveModal(null)}>✕</button>
            </header>

            <form onSubmit={handleCreateSubmit} className="form-grid">
              <label className="full">
                Tournament Title
                <input
                  required
                  placeholder="e.g. Bashundhara Winter Football Cup 2026"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </label>

              <label>
                Sport
                <select
                  value={createForm.sportType}
                  onChange={(e) => setCreateForm({ ...createForm, sportType: e.target.value })}
                >
                  <option value="Football">Football</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Badminton">Badminton</option>
                </select>
              </label>

              <label>
                Venue Playground
                <select
                  required
                  value={createForm.playground}
                  onChange={(e) => setCreateForm({ ...createForm, playground: e.target.value })}
                >
                  {venues.map((v) => (
                    <option key={v._id} value={v._id}>{v.name} ({v.area || v.division})</option>
                  ))}
                </select>
              </label>

              <label>
                Total Teams
                <select
                  value={createForm.totalTeams}
                  onChange={(e) => setCreateForm({ ...createForm, totalTeams: Number(e.target.value) })}
                >
                  <option value={4}>4 Teams</option>
                  <option value={8}>8 Teams</option>
                  <option value={12}>12 Teams</option>
                  <option value={16}>16 Teams</option>
                </select>
              </label>

              <label>
                Group Count
                <select
                  value={createForm.groupCount}
                  onChange={(e) => setCreateForm({ ...createForm, groupCount: Number(e.target.value) })}
                >
                  <option value={2}>2 Groups</option>
                  <option value={4}>4 Groups</option>
                </select>
              </label>

              <label>
                Start Date
                <input
                  type="date"
                  required
                  min={isoDate()}
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                />
              </label>

              <label>
                End Date
                <input
                  type="date"
                  required
                  min={createForm.startDate}
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                />
              </label>

              <label className="full">
                Registration Fee (BDT)
                <input
                  type="number"
                  min="0"
                  required
                  value={createForm.registrationFee}
                  onChange={(e) => setCreateForm({ ...createForm, registrationFee: e.target.value })}
                />
              </label>

              <label className="full">
                Tournament Rules &amp; Information
                <textarea
                  rows="3"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </label>

              <div className="card-foot full" style={{ marginTop: "14px" }}>
                <button type="button" className="button alt" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="button" disabled={creating}>
                  {creating ? "Publishing tournament…" : "Publish Tournament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
