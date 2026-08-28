const API = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
const user = JSON.parse(localStorage.getItem("authUser") || "{}");
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
if (!token) location = "login.html";
const req = async (path, options = {}) => { const response = await fetch(API + path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } }); const body = await response.json(); if (!response.ok) throw new Error(body.message || "Request failed"); return body.data; };
const say = (message, bad = false) => { const notice = $("#notice"); notice.textContent = message; notice.className = `notice${bad ? " error" : ""}`; notice.style.display = "block"; };
const dateLabel = (value) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const tournamentDateParts = (value) => String(value || "").slice(0, 10).split("-").map(Number);
// Bangladesh is UTC+06 without daylight-saving changes.  Tournament dates are
// Bangladesh calendar dates, so this exactly mirrors the backend deadline.
const registrationDeadline = (tournament) => {
    const [year, month, day] = tournamentDateParts(tournament.startDate);
    return new Date(Date.UTC(year, month - 1, day - 2, 0, 0) - (6 * 60 * 60 * 1000));
};
const sportProfile = (sport) => ({
    Football: { icon: "Football", format: "FIFA World Cup format — 4-team groups, quarter-finals, semi-finals, third place and final" },
    Cricket: { icon: "Cricket", format: "ICC World Cup format — 4-team groups, quarter-finals, semi-finals and final" },
    Badminton: { icon: "Badminton", format: "BWF team format — 4-team groups, cross-group quarter-finals, semi-finals and final" },
}[sport] || { icon: "Tournament", format: "Professional group-stage competition" });
const roundRobinMatchdays = (teams) => {
    const rotation = [...teams];
    if (rotation.length % 2) rotation.push(null);
    return Array.from({ length: rotation.length - 1 }, () => {
        const pairs = Array.from({ length: rotation.length / 2 }, (_, index) => [rotation[index], rotation[rotation.length - 1 - index]])
            .filter(([teamA, teamB]) => teamA && teamB);
        rotation.splice(1, 0, rotation.pop());
        return pairs;
    });
};
const knockoutDemo = (groups, lastGroupMatchDate, sport) => {
    const names = groups.map((group) => group.name.replace("Group ", ""));
    const at = (daysAfter, time) => {
        const date = new Date(lastGroupMatchDate);
        date.setUTCDate(date.getUTCDate() + daysAfter);
        return { date, time };
    };
    if (names.length === 2) return [
        { stage: "Semi-final 1", teamA: `Winner Group ${names[0]}`, teamB: `Runner-up Group ${names[1]}`, ...at(1, "13:00") },
        { stage: "Semi-final 2", teamA: `Winner Group ${names[1]}`, teamB: `Runner-up Group ${names[0]}`, ...at(1, "17:00") },
        ...(sport === "Football" ? [{ stage: "Third-place match", teamA: "Loser Semi-final 1", teamB: "Loser Semi-final 2", ...at(2, "13:00") }] : []),
        { stage: "Final", teamA: "Winner Semi-final 1", teamB: "Winner Semi-final 2", ...at(2, "17:00") },
    ];
    if (names.length === 4) return [
        { stage: "Quarter-final 1", teamA: `Winner Group ${names[0]}`, teamB: `Runner-up Group ${names[1]}`, ...at(1, "09:00") },
        { stage: "Quarter-final 2", teamA: `Winner Group ${names[1]}`, teamB: `Runner-up Group ${names[0]}`, ...at(1, "13:00") },
        { stage: "Quarter-final 3", teamA: `Winner Group ${names[2]}`, teamB: `Runner-up Group ${names[3]}`, ...at(1, "17:00") },
        { stage: "Quarter-final 4", teamA: `Winner Group ${names[3]}`, teamB: `Runner-up Group ${names[2]}`, ...at(2, "09:00") },
        { stage: "Semi-final 1", teamA: "Winner Quarter-final 1", teamB: "Winner Quarter-final 3", ...at(3, "13:00") },
        { stage: "Semi-final 2", teamA: "Winner Quarter-final 2", teamB: "Winner Quarter-final 4", ...at(3, "17:00") },
        ...(sport === "Football" ? [{ stage: "Third-place match", teamA: "Loser Semi-final 1", teamB: "Loser Semi-final 2", ...at(4, "13:00") }] : []),
        { stage: "Final", teamA: "Winner Semi-final 1", teamB: "Winner Semi-final 2", ...at(4, "17:00") },
    ];
    return [
        { stage: "Knockout round", teamA: "Qualified team 1", teamB: "Qualified team 2", ...at(2, "13:00") },
        { stage: "Semi-final 1", teamA: "Winner Knockout round 1", teamB: "Winner Knockout round 2", ...at(1, "13:00") },
        { stage: "Semi-final 2", teamA: "Winner Knockout round 3", teamB: "Winner Knockout round 4", ...at(1, "17:00") },
        { stage: "Final", teamA: "Winner Semi-final 1", teamB: "Winner Semi-final 2", ...at(0, "17:00") },
    ];
};
let tournaments = [], selected = null, tournamentSearch = new URLSearchParams(location.search).get("search") || "";
const requestedFixtureId = new URLSearchParams(location.search).get("fixture");
const tournamentListPath = () => user.role === "playground-admin" ? "/tournaments/my-playgrounds/tournaments" : "/tournaments";

async function list() {
    tournaments = await req(tournamentListPath());
    $("#content").innerHTML = tournaments.length ? tournaments.map((tournament) => `<article class="card"><span class="badge">${esc(tournament.status)}</span><h3>${esc(tournament.name)}</h3><p>${esc(tournament.sportType)} · ${dateLabel(tournament.startDate)} – ${dateLabel(tournament.endDate)}<br>${esc(tournament.playground?.name || tournament.playgrounds?.[0]?.name || "Venue TBA")}</p><div class="card-foot"><strong>৳${tournament.registrationFee}</strong>${user.role === "customer" && tournament.status === "Upcoming" ? `<button onclick="join('${tournament._id}')">Join</button>` : `<button class="alt" onclick="detail('${tournament._id}')">Fixtures</button>`}</div></article>`).join("") : '<div class="empty">No tournament is available right now.</div>';
}

window.detail = async (id) => { try { const [groups, teams, matches] = await Promise.all([req(`/tournaments/${id}/groups`), req(`/tournaments/${id}/teams`), req(`/tournaments/${id}/matches`)]); const tournament = tournaments.find((item) => item._id === id); const fixtures = matches.map((match, index) => `${index + 1}. ${dateLabel(match.matchDate)} ${match.startTime}-${match.endTime}: ${match.teamA?.teamName || "TBD"} vs ${match.teamB?.teamName || "TBD"}${match.group?.name ? ` (${match.group.name})` : ""}`).join(" | "); say(`${tournament.name}: ${teams.length}/${tournament.totalTeams} teams · Groups: ${groups.map((group) => group.name).join(", ") || "awaiting approval"}. ${fixtures || "Fixtures will be published automatically when all teams register."}`); } catch (error) { say(error.message, true); } };

function rosterField(index, extra) {
    const label = extra ? `Extra player ${index + 1} (optional)` : `Player ${index + 1}`;
    return `<section class="panel" data-roster data-extra="${extra}"><h3>${label}</h3><div class="form-grid"><input data-name placeholder="${label} name" ${extra ? "" : "required"}><input data-phone inputmode="tel" placeholder="${label} phone number" ${extra ? "" : "required"}><label class="full meta">${label} photo<input data-photo type="file" accept="image/*" ${extra ? "" : "required"}></label></div></section>`;
}
function renderRoster() {
    const playing = Math.max(0, Number(selected.playingMembers) - 1);
    const extras = Math.max(0, Number(selected.extraMembers));
    $("#roster-fields").innerHTML = `<h3>Playing players</h3><p class="meta">Add every player’s name, phone number and recent photo.</p><div class="grid">${Array.from({ length: playing }, (_, index) => rosterField(index, false)).join("")}</div>${extras ? `<h3>Extra players</h3><p class="meta">Extra-player details are optional, but all three fields are required once you add one.</p><div class="grid">${Array.from({ length: extras }, (_, index) => rosterField(index, true)).join("")}</div>` : ""}`;
}
window.join = async (id) => { try { selected = await req(`/tournaments/${id}`); $("#join-title").textContent = `Join ${selected.name}`; $("#join-info").textContent = `৳${selected.registrationFee} · ${selected.playingMembers} playing member(s), up to ${selected.extraMembers} extra player(s). ${sportProfile(selected.sportType).format}. Registration closes at the start of ${dateLabel(registrationDeadline(selected))}.`; renderRoster(); $("#join-modal").classList.add("show"); } catch (error) { say(error.message, true); } };

$("#close-modal").onclick = () => $("#join-modal").classList.remove("show");
$("#join-form").onsubmit = async (event) => {
    event.preventDefault();
    const captainPhoto = $("#captain-photo").files[0];
    if (!captainPhoto) return say("Add the captain photo.", true);
    const players = [], photos = [];
    for (const row of document.querySelectorAll("[data-roster]")) {
        const name = row.querySelector("[data-name]").value.trim(), phone = row.querySelector("[data-phone]").value.trim(), photo = row.querySelector("[data-photo]").files[0], extra = row.dataset.extra === "true";
        if (extra && !name && !phone && !photo) continue;
        if (!name || !phone || !photo) return say("Every added player needs a name, phone number and photo.", true);
        if (photo.size > 2 * 1024 * 1024) return say("Each player photo must be 2 MB or smaller.", true);
        players.push({ name, phone, isPlaying: !extra }); photos.push(photo);
    }
    if (captainPhoto.size > 2 * 1024 * 1024) return say("Each player photo must be 2 MB or smaller.", true);
    const data = new FormData();
    data.append("teamName", $("#team-name").value.trim());
    data.append("captain", JSON.stringify({ name: $("#captain-name").value.trim(), phone: $("#captain-phone").value.trim() }));
    data.append("players", JSON.stringify(players)); data.append("captainPhoto", captainPhoto); photos.forEach((photo) => data.append("playerPhotos", photo));
    try { const team = await req(`/tournaments/${selected._id}/register`, { method: "POST", body: data }); const provider = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", card: "Card" }[$("#join-method").value]; const checkout = await req("/payments/demo/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tournamentTeam: team._id, paymentMethod: provider }) }); sessionStorage.setItem("turfFixtureTournament", selected._id); location.href = `demo-payment.html?payment=${checkout.payment._id}`; } catch (error) { say(error.message, true); }
};

async function venues() {
    const grounds = await req(user.role === "playground-admin" ? "/playgrounds/my-playgrounds" : "/playgrounds");
    $("#venue").innerHTML = '<option value="">Choose an approved playground</option>' + grounds.map((ground) => `<option value="${ground._id}">${esc(ground.name)} · ${esc(ground.area || ground.address)}</option>`).join("");
    updateCreatorPreview();
}
const canCreateTournament = ["super-admin", "playground-admin"].includes(user.role);
$("#create-toggle").onclick = () => {
    if (!canCreateTournament) return say("Only playground administrators and super administrators can create tournaments.", true);
    $("#create-panel").classList.toggle("show");
};
const creatorForm = $("#create-form");
// The published fixture engine has verified brackets for two or four groups.
// Do not offer group counts that would create an undefined knockout route.
creatorForm?.querySelectorAll('select[name="groupCount"] option[value="6"], select[name="groupCount"] option[value="8"]').forEach((option) => option.remove());
const normalizeName = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
const setCreateFeedback = (message = "", type = "error") => {
    const box = $("#create-feedback");
    box.hidden = !message;
    box.className = `create-feedback full${type === "ok" ? " ok" : ""}`;
    if (!message) { box.textContent = ""; return; }
    const duplicate = /duplicate tournament/i.test(message);
    box.innerHTML = duplicate
        ? `<strong>Duplicate event prevented</strong>${esc(message)}<br><small>Next step: keep the existing tournament, or change its name, venue, or start date.</small>`
        : `<strong>Review this setup</strong>${esc(message)}`;
};
const updateCreatorPreview = () => {
    const data = Object.fromEntries(new FormData(creatorForm));
    const teamCount = Number(data.totalTeams || 0), groupCount = Number(data.groupCount || 0);
    const sport = data.sportType || "";
    $("#preview-title").textContent = data.name?.trim() || "Your tournament";
    $("#preview-sport").textContent = sport ? sportProfile(sport).format : "Choose a sport";
    $("#preview-format").textContent = sport === "Football" ? "FIFA World Cup: groups → knockout → final" : sport === "Cricket" ? "ICC Cricket World Cup: groups → knockout → final" : sport === "Badminton" ? "BWF World Championships: groups → knockout → final" : "Choose a sport to see the format";
    $("#preview-capacity").textContent = teamCount && groupCount ? `${teamCount} teams · ${groupCount} groups · ${teamCount % groupCount === 0 ? teamCount / groupCount : "—"} per group` : "Set teams and groups";
    if (data.startDate) {
        const deadline = registrationDeadline({ startDate: `${data.startDate}T00:00:00.000Z` });
        $("#preview-deadline").textContent = `Closes ${dateLabel(deadline)} at 12:00 AM`;
    } else $("#preview-deadline").textContent = "Set a start date";
    const guidance = $("#format-guidance");
    guidance.textContent = teamCount && groupCount && teamCount % groupCount !== 0
        ? "Teams must divide evenly into groups. Adjust total teams or group count before continuing."
        : "Each group uses FIFA-style matchdays, so every team plays once in each round.";
    guidance.classList.toggle("warning", Boolean(teamCount && groupCount && teamCount % groupCount !== 0));
    if (teamCount && groupCount && teamCount % groupCount === 0 && [2, 4].includes(groupCount)) {
        const teamsPerGroup = teamCount / groupCount;
        const groupFixtures = groupCount * ((teamsPerGroup * (teamsPerGroup - 1)) / 2);
        const groupDays = Math.ceil(groupFixtures / 3);
        const knockoutDays = groupCount === 4 ? 4 : 2;
        const minimumDays = groupDays + knockoutDays;
        guidance.textContent = `${groupFixtures} group fixtures across ${groupDays} match day(s), then ${groupCount === 4 ? "quarter-finals, semi-finals and final" : "semi-finals and final"}. With one venue and three daily slots, allow at least ${minimumDays} calendar day(s).`;
        guidance.classList.remove("warning");
    }
};
creatorForm.addEventListener("input", updateCreatorPreview);
creatorForm.addEventListener("change", updateCreatorPreview);
$("#create-form").onsubmit = async (event) => {
    const form = event.currentTarget;
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const payload = { ...raw, playground: $("#venue").value, totalTeams: Number(raw.totalTeams), groupCount: Number(raw.groupCount), playingMembers: Number(raw.playingMembers), extraMembers: Number(raw.extraMembers), registrationFee: Number(raw.registrationFee) };
    setCreateFeedback();
    if (payload.totalTeams % payload.groupCount !== 0) return setCreateFeedback("Total teams must be divisible by the selected number of groups.");
    if (payload.endDate < payload.startDate) return setCreateFeedback("End date cannot be before the tournament start date.");
    const duplicate = tournaments.find((item) => normalizeName(item.name) === normalizeName(payload.name) && String(item.playground?._id || item.playground) === String(payload.playground) && String(item.startDate).slice(0, 10) === payload.startDate && item.status !== "Cancelled");
    if (duplicate) return setCreateFeedback(`Duplicate tournament detected: ${duplicate.name} is already scheduled here on ${dateLabel(duplicate.startDate)}.`);
    try {
        const result = await req("/tournaments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const message = result.tournament?.venueApprovalStatus === "Pending" ? "Venue approval request sent to the playground admin." : "Tournament created successfully. The demo fixture is ready for organisers.";
        setCreateFeedback(message, "ok");
        say(message);
        form.reset();
        updateCreatorPreview();
        list();
    } catch (error) { setCreateFeedback(error.message); say(error.message, true); }
};
if (canCreateTournament) { $("#create-toggle").hidden = false; venues().catch((error) => say(error.message, true)); }
$("#logout").onclick = () => { localStorage.clear(); location = "login.html"; };
function decorateTournamentManagement() {
    if (!["super-admin", "playground-admin"].includes(user.role)) return;
    document.querySelectorAll("#content > .card").forEach((card, index) => {
        const tournament = tournaments[index];
        if (!tournament) return;
        const footer = card.querySelector(".card-foot");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "alt";
        button.textContent = "Manage matches";
        button.addEventListener("click", () => manageMatches(tournament._id));
        footer.append(button);
    });
}

async function manageMatches(tournamentId) {
    try {
        const [tournament, matches] = await Promise.all([req(`/tournaments/${tournamentId}`), req(`/tournaments/${tournamentId}/matches`)]);
        const modal = document.createElement("div");
        modal.className = "modal show";
        const matchRows = matches.length ? matches.map((match) => `<article class="panel match-manager-row"><div><span class="badge">${esc(match.stage)} · ${esc(match.matchStatus)}</span><h3>${esc(match.teamA?.teamName || "TBD")} <small>vs</small> ${esc(match.teamB?.teamName || "TBD")}</h3><p class="meta">${esc(match.playground?.name || "Venue TBA")}</p></div><form class="form-grid schedule-match" data-match-id="${match._id}"><input name="matchDate" type="date" value="${String(match.matchDate).slice(0, 10)}" required><input name="startTime" type="time" value="${esc(match.startTime)}" required><input name="endTime" type="time" value="${esc(match.endTime)}" required><select name="matchStatus"><option ${match.matchStatus === "Scheduled" ? "selected" : ""}>Scheduled</option><option ${match.matchStatus === "Live" ? "selected" : ""}>Live</option><option ${match.matchStatus === "Cancelled" ? "selected" : ""}>Cancelled</option></select><button>Save schedule</button></form>${match.matchStatus !== "Completed" && user.role === "playground-admin" ? `<form class="form-grid result-match" data-match-id="${match._id}"><input name="teamAScore" type="number" min="0" placeholder="${esc(match.teamA?.teamName || "Team A")} score" required><input name="teamBScore" type="number" min="0" placeholder="${esc(match.teamB?.teamName || "Team B")} score" required><button class="full">Publish result</button></form>` : `<p class="meta">${match.matchStatus === "Completed" ? `Final score: ${match.teamAScore} – ${match.teamBScore}` : "Only the venue playground admin can publish the result."}</p>`}</article>`).join("") : '<p class="empty">Fixtures are generated automatically after every team has registered.</p>';
        modal.innerHTML = `<div class="modal-box match-manager"><button class="close" type="button">Close</button><h2>${esc(tournament.name)} fixtures</h2><p class="meta">FIFA-style fixtures use stage, teams, venue, match date and kick-off time. Playground admins can update only matches at their own venue.</p><div class="match-manager-list">${matchRows}</div></div>`;
        document.body.append(modal);
        modal.querySelector(".close").onclick = () => modal.remove();
        modal.querySelectorAll(".schedule-match").forEach((form) => form.onsubmit = async (event) => {
            event.preventDefault();
            const payload = Object.fromEntries(new FormData(form));
            try { await req(`/tournaments/${tournamentId}/matches/${form.dataset.matchId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); say("Match schedule updated."); modal.remove(); manageMatches(tournamentId); }
            catch (error) { say(error.message, true); }
        });
        modal.querySelectorAll(".result-match").forEach((form) => form.onsubmit = async (event) => {
            event.preventDefault();
            const raw = Object.fromEntries(new FormData(form));
            try { await req(`/tournaments/matches/${form.dataset.matchId}/result`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamAScore: Number(raw.teamAScore), teamBScore: Number(raw.teamBScore), matchStatus: "Completed" }) }); say("Match result published and standings updated."); modal.remove(); manageMatches(tournamentId); }
            catch (error) { say(error.message, true); }
        });
    } catch (error) { say(error.message, true); }
}

const registrationOpen = (tournament) => {
    return tournament.status === "Upcoming" && Date.now() < registrationDeadline(tournament).getTime();
};

const tournamentStatusLabel = (tournament) => tournament.status;

function updateTournamentOverview() {
    let overview = document.querySelector(".tournament-overview");
    if (!overview) {
        overview = document.createElement("section");
        overview.className = "tournament-overview";
        document.querySelector(".portal-head").insertAdjacentElement("afterend", overview);
    }
    const upcoming = tournaments.filter((tournament) => registrationOpen(tournament)).length;
    overview.innerHTML = `<div><span>COMPETITIONS</span><strong>${tournaments.length}</strong><small>Available tournaments</small></div><div><span>READY TO PLAY</span><strong>${upcoming}</strong><small>Upcoming events</small></div><p><b>✦</b> Find your next challenge and register your team today.</p>`;
}

list = async function () {
    tournaments = await req(tournamentListPath());
    updateTournamentOverview();
    const term = tournamentSearch.trim().toLowerCase();
    const visibleTournaments = term ? tournaments.filter((tournament) => [tournament.name, tournament.sportType, tournament.playground?.name, tournament.playgrounds?.[0]?.name].filter(Boolean).join(" ").toLowerCase().includes(term)) : tournaments;
    $("#content").innerHTML = visibleTournaments.length ? visibleTournaments.map((tournament) => {
        const canRegister = user.role === "customer" && registrationOpen(tournament);
        const action = canRegister ? `<button onclick="join('${tournament._id}')">Join tournament</button>` : `<button class="alt" onclick="detail('${tournament._id}')">View competition</button>`;
        const profile = sportProfile(tournament.sportType);
        const registrationNote = user.role === "customer" && tournament.status === "Upcoming" ? (canRegister ? `<br><small>Register by ${dateLabel(registrationDeadline(tournament))}.</small>` : '<br><small>Registration is closed for this tournament.</small>') : "";
        return `<article class="card"><span class="badge">${esc(tournamentStatusLabel(tournament))}</span><h3>${esc(tournament.name)}</h3><p><b>${esc(profile.icon)}</b> · ${esc(tournament.sportType)}<br>${dateLabel(tournament.startDate)} – ${dateLabel(tournament.endDate)}<br>${esc(tournament.playground?.name || tournament.playgrounds?.[0]?.name || "Venue TBA")}${registrationNote}</p><div class="card-foot"><strong>৳${Number(tournament.registrationFee || 0).toLocaleString()}</strong>${action}</div></article>`;
    }).join("") : `<div class="empty">${term ? "No tournament matches your search." : "No tournament is available right now."}</div>`;
};

const searchPanel = document.createElement("section");
searchPanel.className = "panel tournament-search";
searchPanel.innerHTML = '<label for="tournament-search">Find a tournament<input id="tournament-search" type="search" placeholder="Search by tournament, sport or venue" autocomplete="off"></label>';
$("#content").insertAdjacentElement("beforebegin", searchPanel);
$("#tournament-search").value = tournamentSearch;
$("#tournament-search").addEventListener("input", (event) => {
    tournamentSearch = event.target.value;
    list().then(decorateTournamentManagement).catch((error) => say(error.message, true));
});

list().then(() => {
    decorateTournamentManagement();
    const fixtureId = requestedFixtureId || sessionStorage.getItem("turfFixtureTournament");
    if (fixtureId) {
        sessionStorage.removeItem("turfFixtureTournament");
        detail(fixtureId);
    }
}).catch((error) => say(error.message, true));

async function loadMyTournamentRegistrations() {
    if (user.role !== "customer") return;
    try {
        const teams = await req("/tournaments/my-registrations");
        if (!teams.length) return;
        const section = document.createElement("section");
        section.className = "panel";
        section.id = "my-tournament-registrations";
        const cancellationAllowed = (team) => {
            return team.tournament?.status === "Upcoming" && Date.now() < registrationDeadline(team.tournament).getTime();
        };
        const payments = await req("/payments/my-payments");
        const pendingByTeam = new Map(payments.filter((payment) => payment.paymentStatus === "Pending" && payment.tournamentTeam).map((payment) => [String(payment.tournamentTeam?._id || payment.tournamentTeam), payment]));
        section.innerHTML = `<h2>My tournament registrations</h2><p class="meta">After registering, open your demo fixture to see your team name in the provisional draw. The final schedule is released the day before the tournament.</p><div class="grid">${teams.map((team) => { const pendingPayment = pendingByTeam.get(String(team._id)); return `<article class="card"><span class="badge">${esc(team.paymentStatus)}</span><h3>${esc(team.teamName)}</h3><p>${esc(team.tournament?.name || "Tournament")}<br>${dateLabel(team.tournament?.startDate)} – ${dateLabel(team.tournament?.endDate)}</p><div class="card-foot"><button class="alt" type="button" data-fixture-tournament="${team.tournament?._id}">View demo fixture</button>${pendingPayment ? `<a class="button" href="demo-payment.html?payment=${encodeURIComponent(pendingPayment._id)}">Complete payment</a>` : ""}${cancellationAllowed(team) ? `<button class="alt" type="button" data-team-id="${team._id}">Cancel registration</button>` : "<small>Registration cancellation is closed.</small>"}</div></article>`; }).join("")}</div>`;
        $("#content").before(section);
        section.querySelectorAll("[data-fixture-tournament]").forEach((button) => button.addEventListener("click", () => detail(button.dataset.fixtureTournament)));
        section.querySelectorAll("[data-team-id]").forEach((button) => button.addEventListener("click", async () => {
            if (!confirm("Cancel this tournament registration? Cancellation is allowed only at least 2 days before it starts. Any paid refund is handled by the tournament organizer.")) return;
            button.disabled = true;
            try { await req(`/tournaments/teams/${button.dataset.teamId}/cancel`, { method: "PATCH" }); say("Tournament registration cancelled."); section.remove(); loadMyTournamentRegistrations(); }
            catch (error) { say(error.message, true); button.disabled = false; }
        }));
    } catch (error) { say(error.message, true); }
}
loadMyTournamentRegistrations();

document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="assets/css/tournament-centre.css">');

function downloadFixturePdf(tournament, matches) {
    if (!matches.length) return say("Fixtures are not published yet.", true);
    const popup = window.open("", "_blank");
    if (!popup) return say("Allow pop-ups to save the fixture as a PDF.", true);
    const venue = tournament?.playground?.name || tournament?.playgrounds?.[0]?.name || "Venue TBA";
    const rows = matches.map((match, index) => `<tr><td>${index + 1}</td><td>${esc(dateLabel(match.matchDate))}</td><td>${esc(match.startTime)} - ${esc(match.endTime)}</td><td>${esc(match.group?.name || match.stage || "Group stage")}</td><td>${esc(match.teamA?.teamName || "TBD")} vs ${esc(match.teamB?.teamName || "TBD")}</td><td>${esc(match.matchStatus)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(tournament?.name || "Tournament")} fixtures</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#173420;margin:0}header{border-bottom:3px solid #137a39;padding-bottom:14px;margin-bottom:18px}h1{margin:0 0 7px;font-size:22px}p{margin:4px 0;color:#52655a;font-size:12px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#137a39;color:#fff;text-align:left}th,td{padding:9px 7px;border:1px solid #d6e5d9;vertical-align:top}tr:nth-child(even){background:#f4faf5}footer{margin-top:16px;font-size:9px;color:#697a6f}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header><h1>${esc(tournament?.name || "Tournament")} - Official Fixture</h1><p>${esc(tournament?.sportType || "Tournament")} | ${esc(venue)}</p><p>${esc(dateLabel(tournament?.startDate))} - ${esc(dateLabel(tournament?.endDate))}</p></header><table><thead><tr><th>#</th><th>Date</th><th>Time</th><th>Stage / Group</th><th>Fixture</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><footer>Generated from TURF Tournament Centre on ${esc(new Date().toLocaleString("en-GB"))}.</footer></body></html>`);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
}

window.detail = async (id) => {
    try {
        const [groups, teams, matches, standings] = await Promise.all([
            req(`/tournaments/${id}/groups`), req(`/tournaments/${id}/teams`), req(`/tournaments/${id}/matches`), req(`/tournaments/${id}/standings`),
        ]);
        const tournament = tournaments.find((item) => item._id === id);
        const sport = tournament?.sportType || "Tournament";
        const groupName = (group) => group?.name || "Group stage";
        const draw = groups.map((group) => `<article class="group-card"><h3>${esc(group.name)}</h3><ol>${teams.filter((team) => String(team.group?._id || team.group) === String(group._id)).map((team) => `<li>${esc(team.teamName)}</li>`).join("") || "<li>Teams are being assigned</li>"}</ol></article>`).join("");
        const groupSchedules = groups.map((group) => {
            const groupTeams = teams.filter((team) => String(team.group?._id || team.group) === String(group._id));
            const slots = Array.from({ length: Number(tournament?.teamsPerGroup || 0) }, (_, index) => groupTeams[index]?.teamName || `Open team slot ${index + 1}`);
            return { group: group.name, matchdays: roundRobinMatchdays(slots) };
        });
        let demoFixtureIndex = 0;
        const previewFixtures = [];
        const totalMatchdays = Math.max(...groupSchedules.map((schedule) => schedule.matchdays.length));
        for (let matchday = 0; matchday < totalMatchdays; matchday += 1) {
            groupSchedules.forEach((schedule) => (schedule.matchdays[matchday] || []).forEach(([teamA, teamB]) => {
                const matchDate = new Date(tournament.startDate);
                matchDate.setUTCDate(matchDate.getUTCDate() + Math.floor(demoFixtureIndex / 3));
                const startHour = [9, 13, 17][demoFixtureIndex % 3];
                demoFixtureIndex += 1;
                previewFixtures.push({
                    group: schedule.group,
                    matchday: matchday + 1,
                    teamA,
                    teamB,
                    matchDate,
                    startTime: `${String(startHour).padStart(2, "0")}:00`,
                    endTime: `${String(startHour + 3).padStart(2, "0")}:00`,
                });
            }));
        }
        const knockoutFixtures = knockoutDemo(groups, previewFixtures.at(-1)?.matchDate || new Date(tournament.startDate), sport);
        let preview = previewFixtures.length
            ? `<p class="fixture-preview-note">${esc(sportProfile(sport).format)}. Every team plays once per matchday; open team slots are provisional. This demo includes the complete knockout route through the final.</p><div class="fixtures-list">${previewFixtures.map((match, index) => `<article class="fixture-row preview"><div class="fixture-time">Match ${index + 1}<br>${dateLabel(match.matchDate)} · ${esc(match.startTime)}–${esc(match.endTime)}<br>${esc(match.group)} · Matchday ${match.matchday}</div><div class="fixture-teams">${esc(match.teamA)} <span>vs</span> ${esc(match.teamB)}</div><div class="fixture-score">Group stage</div></article>`).join("")}<h3 class="knockout-title">Knockout path</h3>${knockoutFixtures.map((match) => `<article class="fixture-row knockout-preview"><div class="fixture-time">${dateLabel(match.date)} · ${esc(match.time)}<br>${esc(match.stage)}</div><div class="fixture-teams">${esc(match.teamA)} <span>vs</span> ${esc(match.teamB)}</div><div class="fixture-score">Knockout</div></article>`).join("")}</div>`
            : '<div class="fixture-empty">The draw preview will appear when the tournament groups are ready.</div>';
        const fixtureEnd = knockoutFixtures.at(-1)?.date;
        if (previewFixtures.length && fixtureEnd && fixtureEnd > new Date(tournament.endDate)) {
            preview = `<p class="fixture-capacity-warning">This full draw needs dates through ${dateLabel(fixtureEnd)}. Extend the tournament period before publishing the final fixture.</p>${preview}`;
        }
        const table = standings.map((standing) => `<h3 class="standings-group-title">${esc(standing.group)}</h3><div class="standings-wrap"><table class="standings-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>${sport === "Football" ? "GD" : "Diff"}</th><th>Pts</th></tr></thead><tbody>${standing.teams.map((team, index) => `<tr><td><span class="standing-rank">${index + 1}</span></td><td>${esc(team.teamName)}</td><td>${team.played}</td><td>${team.won}</td><td>${team.drawn}</td><td>${team.lost}</td><td>${team.goalDifference}</td><td><strong>${team.points}</strong></td></tr>`).join("")}</tbody></table></div>`).join("") || '<div class="fixture-empty">The points table will appear once groups are assigned.</div>';
        const fixtures = matches.map((match) => `<article class="fixture-row ${match.matchStatus === "Live" ? "live" : ""}"><div class="fixture-time">${dateLabel(match.matchDate)}<br>${esc(match.startTime)}–${esc(match.endTime)} · ${esc(groupName(match.group))}${match.matchday ? `<br>Matchday ${match.matchday}` : `<br>${esc(match.stage)}`}</div><div class="fixture-teams">${esc(match.teamA?.teamName || "TBD")} <span>vs</span> ${esc(match.teamB?.teamName || "TBD")}</div><div class="fixture-score">${match.matchStatus === "Live" ? '<span class="live-tag">LIVE</span>' : match.matchStatus === "Completed" ? `${match.teamAScore} – ${match.teamBScore}` : esc(match.matchStatus)}</div></article>`).join("") || '<div class="fixture-empty">Fixtures are released automatically one day before the tournament begins.</div>';
        const modal = document.createElement("div"); modal.className = "modal show";
        modal.innerHTML = `<div class="modal-box tournament-centre"><header class="centre-head"><button class="close" type="button">Close</button><span class="eyebrow">${esc(sport.toUpperCase())} COMPETITION</span><h2>${esc(tournament?.name || "Tournament centre")}</h2><p>${dateLabel(tournament?.startDate)} – ${dateLabel(tournament?.endDate)} · ${esc(tournament?.playground?.name || tournament?.playgrounds?.[0]?.name || "Venue TBA")}<br><strong>${esc(sportProfile(sport).format)}</strong></p>${matches.length ? '<button class="fixture-pdf" type="button">Save fixture as PDF</button>' : ""}</header><div class="centre-body"><div class="centre-tabs"><button class="active" data-centre-tab="draw">Group draw</button><button data-centre-tab="preview">Demo fixture</button><button data-centre-tab="table">Points table</button><button data-centre-tab="fixtures">Official fixtures</button></div><section class="centre-panel" data-centre-panel="draw"><div class="group-draw">${draw || '<div class="fixture-empty">Groups will be available after registration closes.</div>'}</div></section><section class="centre-panel" data-centre-panel="preview" hidden>${preview}</section><section class="centre-panel" data-centre-panel="table" hidden>${table}</section><section class="centre-panel" data-centre-panel="fixtures" hidden><div class="fixtures-list">${fixtures}</div></section></div></div>`;
        document.body.append(modal); modal.querySelector(".close").onclick = () => modal.remove();
        modal.querySelector(".fixture-pdf")?.addEventListener("click", () => downloadFixturePdf(tournament, matches));
        modal.querySelectorAll("[data-centre-tab]").forEach((button) => button.onclick = () => { modal.querySelectorAll("[data-centre-tab]").forEach((tab) => tab.classList.toggle("active", tab === button)); modal.querySelectorAll("[data-centre-panel]").forEach((panel) => { panel.hidden = panel.dataset.centrePanel !== button.dataset.centreTab; }); });
    } catch (error) { say(error.message, true); }
};
