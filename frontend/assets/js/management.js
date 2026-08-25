const API = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
let me;
try { me = JSON.parse(localStorage.getItem("authUser") || "{}"); } catch (_) { me = {}; }

const $ = (selector) => document.querySelector(selector);
const E = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
const R = async (path, options = {}) => {
    const response = await fetch(API + path, { ...options, headers: { Authorization: "Bearer " + token, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Request failed");
    return body.data;
};
const say = (message, bad = false) => {
    const notice = $("#notice");
    notice.textContent = message;
    notice.className = "notice" + (bad ? " error" : "");
    notice.style.display = "block";
};
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Not available";
const statusClass = (value) => String(value || "").toLowerCase().replace(/\s+/g, "-");
const role = me.role;

document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="assets/css/account-actions.css">');
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="assets/css/profile-premium.css">');
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="assets/css/profile-sections.css">');
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="assets/css/slot-schedules.css">');
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="assets/css/income.css">');
document.head.insertAdjacentHTML("beforeend", '<style>.ground-detail-images{display:flex;gap:8px;overflow:auto;margin:16px 0}.ground-detail-images img{width:160px;height:105px;object-fit:cover;border-radius:10px}.ground-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0 18px}.ground-detail-grid div{padding:11px;border:1px solid #d9e9de;border-radius:9px;background:#f9fcfa}.ground-detail-grid b,.ground-detail-grid span{display:block}.ground-detail-grid b{font-size:.72rem;color:#68766d;margin-bottom:4px}.ground-detail-grid span{font-size:.84rem;line-height:1.45}</style>');

if (!token || !role) location.replace("login.html");

const tabs = role === "customer"
    ? ["Profile", "Reports"]
    : role === "playground-admin"
        ? ["Profile", "Playgrounds", "Slots", "Bookings", "Income", "Reports"]
        : ["Profile", "Users", "Playgrounds", "Reports"];
const requestedTab = new URLSearchParams(location.search).get("tab");
const initialTab = tabs.includes(requestedTab) ? requestedTab : tabs[0];

function setTitle(tab) {
    $("#title").textContent = tab === "Profile" ? "Account centre" : tab === "Reports" ? "Issue reports" : tab === "Bookings" ? "Booking history" : tab === "Income" ? "Income overview" : role.replace("-", " ") + " operations";
    $("#subtitle").textContent = tab === "Reports"
        ? "Submit, track and resolve issues with a clear audit trail."
        : "Manage your TURF account and activity.";
}

// Reports is a dedicated dashboard destination, not an Account centre tab.
$("#tabs").innerHTML = tabs.filter((tab) => tab !== "Reports").map((tab) => '<button class="' + (tab === initialTab ? "active" : "") + '" data-tab="' + tab + '">' + tab + "</button>").join("");
// Account centre is intentionally profile-only. Every operation is reached
// from dashboard navigation, so this legacy tab bar is never displayed.
$("#tabs").hidden = true;
setTitle(initialTab);

async function profile() {
    const user = await R("/users/me");
    const birthDate = user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "";
    const photo = user.profileImage
        ? '<img src="' + E(user.profileImage) + '" alt="Profile photo">'
        : E((user.name || "U").trim().charAt(0).toUpperCase());
    $("#panel").innerHTML = '<section class="profile-workspace"><aside class="profile-card"><div class="profile-photo" id="profile-preview">' + photo + "</div><h2>" + E(user.name) + '</h2><p>' + E(user.email) + '</p><label class="photo-upload">Change profile photo<input id="profile-image" type="file" accept="image/*"></label><p>JPG, PNG or WebP, up to 5 MB.</p></aside><article class="panel profile-form-card"><h2>Personal information</h2><p>Keep your contact details and account information up to date.</p><form id="profile-form" class="form-grid"><label>Full name<input name="name" value="' + E(user.name) + '" minlength="3" required></label><label>Email address<input type="email" value="' + E(user.email) + '" readonly></label><label>Phone number<input name="phone" value="' + E(user.phone) + '" placeholder="01XXXXXXXXX"></label><label>Date of birth<input name="dateOfBirth" type="date" value="' + E(birthDate) + '"></label><label>Gender<select name="gender"><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label><label class="full">Address<input name="address" value="' + E(user.address) + '" placeholder="House, road, area, district"></label><h3>Change email</h3><p class="profile-password-note">Verify the OTP sent to the new email address before it is transferred.</p><label>New email address<input id="new-email" type="email" autocomplete="email"></label><label>Verification OTP<input id="email-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label><div class="card-foot full"><button type="button" id="request-email-otp">Send OTP</button><button type="button" class="alt" id="confirm-email-change">Verify &amp; change email</button></div><h3>Change password</h3><p class="profile-password-note">First request an OTP to your current email, then enter it with your new password.</p><label>New password<input id="new-password" type="password" autocomplete="new-password" minlength="6"></label><label>Verification OTP<input id="password-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label><label class="full">Confirm new password<input id="confirm-new-password" type="password" autocomplete="new-password" minlength="6"></label><div class="card-foot full"><button type="button" id="request-password-otp">Send OTP</button><button type="button" class="alt" id="confirm-password-change">Verify &amp; change password</button></div><button class="full">Save personal information</button></form></article></section>';
    $("#profile-form [name='gender']").value = user.gender || "";
    const actions = document.createElement("div");
    actions.className = "account-actions";
    actions.innerHTML = '<button type="button" class="account-action" id="open-edit-profile"><strong>Edit profile</strong><span>Update your personal information, contact details and photo.</span></button><button type="button" class="account-action security" id="open-change-password"><strong>Change password</strong><span>Secure your account with a verification OTP sent to email.</span></button>';
    document.querySelector(".profile-card").append(actions);
    const summary = document.createElement("div");
    summary.className = "current-profile-info";
    summary.innerHTML = '<div><span>Phone</span><strong>' + E(user.phone || "Not added") + '</strong></div><div><span>Address</span><strong>' + E(user.address || "Not added") + '</strong></div><div><span>Joined</span><strong>' + E(formatDate(user.createdAt)) + '</strong></div>';
    actions.after(summary);
    const form = $("#profile-form");
    const children = Array.from(form.children);
    const headings = children.filter((item) => item.tagName === "H3");
    const emailHeading = headings.find((item) => item.textContent.trim() === "Change email");
    const passwordHeading = headings.find((item) => item.textContent.trim() === "Change password");
    const sectionNodes = (start, end) => children.slice(children.indexOf(start), end ? children.indexOf(end) : children.length);
    const personalNodes = children.slice(0, children.indexOf(emailHeading));
    const passwordNodes = sectionNodes(passwordHeading, null);
    const emailNodes = sectionNodes(emailHeading, passwordHeading);
    const saveProfileButton = form.querySelector("button.full");
    const nav = document.createElement("nav");
    nav.className = "profile-section-nav";
    nav.innerHTML = '<button type="button" data-profile-view="personal">Edit profile</button><button type="button" data-profile-view="password">Change password</button>';
    document.querySelector(".profile-form-card > h2").before(nav);
    const showProfileView = (view, scroll = true) => {
        [...personalNodes, ...emailNodes, ...passwordNodes].forEach((node) => node.classList.add("profile-mode-hidden"));
        (view === "password" ? passwordNodes : personalNodes).forEach((node) => node.classList.remove("profile-mode-hidden"));
        saveProfileButton?.classList.toggle("profile-mode-hidden", view === "password");
        nav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.profileView === view));
        document.querySelector(".profile-form-card > h2").textContent = view === "password" ? "Password & security" : "Edit profile";
        document.querySelector(".profile-form-card > p").textContent = view === "password" ? "We will send a verification OTP to your current email before your password is changed." : "Review and update the personal information shown on your account.";
        if (scroll) document.querySelector(".profile-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
        if (view === "password") setTimeout(() => $("#new-password").focus(), 350);
    };
    nav.querySelectorAll("button").forEach((button) => button.onclick = () => showProfileView(button.dataset.profileView));
    $("#open-edit-profile").onclick = () => showProfileView("personal");
    $("#open-change-password").onclick = () => showProfileView("password");
    showProfileView("personal", false);
    $("#profile-image").onchange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
            event.target.value = "";
            say("Choose an image file no larger than 5 MB.", true);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => { $("#profile-preview").innerHTML = '<img src="' + E(reader.result) + '" alt="New profile photo preview">'; };
        reader.readAsDataURL(file);
    };
    $("#request-email-otp").onclick = async () => {
        try {
            await R("/auth/request-sensitive-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email-change", newEmail: $("#new-email").value.trim() }) });
            say("OTP sent to the new email address.");
        } catch (error) { say(error.message, true); }
    };
    $("#confirm-email-change").onclick = async () => {
        try {
            const updatedUser = await R("/auth/change-email", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newEmail: $("#new-email").value.trim(), otp: $("#email-otp").value.trim() }) });
            me = { ...me, ...updatedUser };
            localStorage.setItem("authUser", JSON.stringify(me));
            say("Email address changed successfully.");
            profile();
        } catch (error) { say(error.message, true); }
    };
    $("#request-password-otp").onclick = async () => {
        try {
            await R("/auth/request-sensitive-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "password-change" }) });
            say("OTP sent to your current email address.");
        } catch (error) { say(error.message, true); }
    };
    $("#confirm-password-change").onclick = async () => {
        try {
            const newPassword = $("#new-password").value;
            if (newPassword !== $("#confirm-new-password").value) throw new Error("New password and confirmation do not match.");
            await R("/auth/change-password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword, otp: $("#password-otp").value.trim() }) });
            say("Password changed successfully.");
            $("#new-password").value = "";
            $("#confirm-new-password").value = "";
            $("#password-otp").value = "";
        } catch (error) { say(error.message, true); }
    };
    $("#profile-form").onsubmit = async (event) => {
        event.preventDefault();
        try {
            const form = event.currentTarget;
            const data = Object.fromEntries(new FormData(form));
            let updatedUser = await R("/users/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            const image = $("#profile-image").files?.[0];
            if (image) {
                const imageData = new FormData();
                imageData.append("profileImage", image);
                updatedUser = await R("/users/me/profile-image", { method: "PUT", body: imageData });
            }
            me = { ...me, ...updatedUser };
            localStorage.setItem("authUser", JSON.stringify(me));
            say("Profile saved successfully. Your account details are now up to date.");
            profile();
        } catch (error) {
            say(error.message, true);
        }
    };
}

function reportStats(reports) {
    const open = reports.filter((report) => ["Pending", "Under Review"].includes(report.status)).length;
    const resolved = reports.filter((report) => report.status === "Resolved").length;
    return '<div class="report-stats"><div class="report-stat"><strong>' + reports.length + '</strong><span>Total reports</span></div><div class="report-stat"><strong>' + open + '</strong><span>Open</span></div><div class="report-stat"><strong>' + resolved + '</strong><span>Resolved</span></div></div>';
}

function userReportCard(report) {
    const target = report.targetType === "User" ? (report.reportedUser?.name || "Customer account") : (report.playground?.name || "Account issue");
    const note = report.adminNote
        ? '<div class="report-review"><div class="report-review-head"><strong>Admin update</strong><span>' + E(formatDate(report.reviewedAt)) + "</span></div><p>" + E(report.adminNote) + "</p></div>"
        : "";
    return '<article class="report-card"><div class="report-card-top"><span class="report-status ' + statusClass(report.status) + '">' + E(report.status) + '</span><span class="report-severity ' + statusClass(report.severity) + '">' + E(report.severity) + "</span></div>"
        + "<h3>" + E(report.subject) + "</h3><p>" + E(report.message) + '</p><div class="report-meta"><span>' + E(report.category) + "</span><span>" + E(target) + "</span><span>" + E(formatDate(report.createdAt)) + "</span></div>" + note + "</article>";
}

async function playgroundAdminReports() {
    const [reportableCustomers, allReports] = await Promise.all([R("/reports/reportable-customers"), R("/reports/my-reports")]);
    const selectedStatus = new URLSearchParams(location.search).get("status") || "All";
    const visibleReports = selectedStatus === "All" ? allReports : allReports.filter((report) => report.status === selectedStatus);
    const customerOptions = reportableCustomers.map((item) => '<option value="' + E(item.customer._id) + '|' + E(item.playground._id) + '">' + E(item.customer.name) + ' — ' + E(item.playground.name) + '</option>').join("");
    const form = reportableCustomers.length
        ? '<form id="customer-report-form" class="form-grid report-form"><input type="hidden" name="targetType" value="User"><select class="full" name="customerRecord" required><option value="">Choose one of your booked customers</option>' + customerOptions + '</select><p class="full report-detail">Only customers with a booking at one of your playgrounds appear in this list.</p><select name="category" required><option value="">Report category</option><option>Customer Misconduct</option><option>Property Damage</option><option>No-show or Late Arrival</option><option>Booking or Payment Issue</option><option>Safety Violation</option><option>Other</option></select><select name="severity" required><option value="Low">Low priority</option><option value="Medium" selected>Medium priority</option><option value="High">High priority</option><option value="Critical">Critical / safety</option></select><input class="full" name="subject" minlength="4" maxlength="120" placeholder="Short report title" required><textarea class="full" name="message" minlength="10" maxlength="2000" placeholder="Describe what happened and include helpful booking details." required></textarea><button class="full">Submit customer report</button></form>'
        : '<p class="empty">There are no booked customers to report for your playgrounds yet.</p>';
    $("#panel").innerHTML = '<section class="report-workspace"><header class="report-hero"><div><h2>Customer report centre</h2><p>Report behaviour or booking issues only for customers of your own playgrounds.</p></div>' + reportStats(allReports) + '</header><div class="report-layout"><article class="report-form-panel"><h3>Report a customer</h3><p class="report-detail">The customer and playground are verified before a report is submitted.</p>' + form + '</article><article class="report-list-panel"><header class="report-panel-head"><div><h3>My report history</h3><span>Only the super admin can update a report status.</span></div><select id="my-report-filter" aria-label="Filter reports"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Under Review">Under review</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option></select></header><div class="report-card-list">' + (visibleReports.length ? visibleReports.map(userReportCard).join("") : '<p class="empty">No reports match this filter.</p>') + '</div></article></div></section>';
    $("#my-report-filter").value = selectedStatus;
    $("#my-report-filter").onchange = (event) => { const url = new URL(location.href); url.searchParams.set("tab", "Reports"); url.searchParams.set("status", event.target.value); location.href = url.toString(); };
    const customerForm = $("#customer-report-form");
    if (customerForm) customerForm.onsubmit = async (event) => {
        event.preventDefault();
        const raw = Object.fromEntries(new FormData(customerForm));
        const [reportedUser, playground] = raw.customerRecord.split("|");
        try {
            await R("/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...raw, reportedUser, playground }) });
            say("Customer report submitted. It is now available for super-admin review.");
            playgroundAdminReports();
        } catch (error) { say(error.message, true); }
    };
}

async function reports() {
    if (role === "playground-admin") return playgroundAdminReports();
    const result = await Promise.all([R("/playgrounds"), R("/reports/my-reports")]);
    const grounds = result[0] || [];
    const allReports = result[1] || [];
    const selectedStatus = new URLSearchParams(location.search).get("status") || "All";
    const visibleReports = selectedStatus === "All" ? allReports : allReports.filter((report) => report.status === selectedStatus);
    const groundOptions = grounds.map((ground) => '<option value="' + E(ground._id) + '">' + E(ground.name) + "</option>").join("");
    $("#panel").innerHTML = '<section class="report-workspace"><header class="report-hero"><div><h2>Report centre</h2><p>Send a detailed issue report and follow its review status from one place.</p></div>' + reportStats(allReports) + '</header><div class="report-layout"><article class="report-form-panel"><h3>Submit an issue</h3><p class="report-detail">Clear details help the team resolve your issue faster.</p><form id="report-form" class="form-grid report-form"><input type="hidden" name="targetType" value="Playground"><select class="full" name="playground" required><option value="">Choose a playground</option>' + groundOptions + '</select><select name="category" required><option value="">Issue category</option><option>Cleanliness</option><option>Maintenance</option><option>Staff Behavior</option><option>Facilities</option><option>Safety</option><option>Booking Issue</option><option>Other</option></select><select name="severity" required><option value="Low">Low priority</option><option value="Medium" selected>Medium priority</option><option value="High">High priority</option><option value="Critical">Critical / safety</option></select><input class="full" name="subject" minlength="4" maxlength="120" placeholder="Short issue title" required><textarea class="full" name="message" minlength="10" maxlength="2000" placeholder="What happened? Include the date, time and helpful details." required></textarea><button class="full">Submit report</button></form></article><article class="report-list-panel"><header class="report-panel-head"><div><h3>My report history</h3><span>Only the super admin can update a report status.</span></div><select id="my-report-filter" aria-label="Filter reports"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Under Review">Under review</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option></select></header><div class="report-card-list">' + (visibleReports.length ? visibleReports.map(userReportCard).join("") : '<p class="empty">No reports match this filter.</p>') + "</div></article></div></section>";
    $("#my-report-filter").value = selectedStatus;
    $("#my-report-filter").onchange = (event) => {
        const url = new URL(location.href);
        url.searchParams.set("tab", "Reports");
        url.searchParams.set("status", event.target.value);
        location.href = url.toString();
    };
    $("#report-form").onsubmit = async (event) => {
        event.preventDefault();
        try {
            await R("/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
            say("Your report was submitted. You can track review updates below.");
            reports();
        } catch (error) {
            say(error.message, true);
        }
    };
}

function adminReportCard(report) {
    const target = report.targetType === "User" ? (report.reportedUser?.name || "Customer account") : (report.playground?.name || "Account issue");
    const note = report.adminNote ? '<div class="report-review"><div class="report-review-head"><strong>Review note</strong><span>' + E(report.reviewedBy?.name || "Admin") + "</span></div><p>" + E(report.adminNote) + "</p></div>" : "";
    return '<article class="report-card" data-report-id="' + E(report._id) + '"><div class="report-card-top"><span class="report-status ' + statusClass(report.status) + '">' + E(report.status) + '</span><span class="report-severity ' + statusClass(report.severity) + '">' + E(report.severity) + "</span></div><h3>" + E(report.subject) + "</h3><p>" + E(report.message) + '</p><div class="report-meta"><span>' + E(report.category) + "</span><span>Reporter: " + E(report.reporter?.name || "Unknown") + "</span><span>" + E(target) + "</span><span>" + E(formatDate(report.createdAt)) + "</span></div>" + note + '<div class="report-actions"><select data-status aria-label="Report status"><option value="Pending">Pending</option><option value="Under Review">Under review</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option></select><textarea data-note maxlength="1000" placeholder="Add a review note (optional)">' + E(report.adminNote || "") + '</textarea><button type="button" data-save>Save review</button></div></article>';
}

function renderAdminReports(allReports) {
    const search = ($("#report-search")?.value || "").trim().toLowerCase();
    const status = $("#report-status-filter")?.value || "All";
    const severity = $("#report-severity-filter")?.value || "All";
    const reportsToShow = allReports.filter((report) => {
        const text = [report.subject, report.message, report.reporter?.name, report.playground?.name, report.reportedUser?.name, report.category].filter(Boolean).join(" ").toLowerCase();
        return (!search || text.includes(search)) && (status === "All" || report.status === status) && (severity === "All" || report.severity === severity);
    });
    $("#admin-report-list").innerHTML = reportsToShow.length ? reportsToShow.map(adminReportCard).join("") : '<p class="empty">No reports match these filters.</p>';
    $("#admin-report-list").querySelectorAll("[data-report-id]").forEach((card) => {
        const select = card.querySelector("[data-status]");
        const report = allReports.find((item) => item._id === card.dataset.reportId);
        select.value = report.status;
        card.querySelector("[data-save]").onclick = () => saveReport(card.dataset.reportId, select.value, card.querySelector("[data-note]").value);
    });
}

let adminReportData = [];
async function adminReports() {
    adminReportData = await R("/reports?limit=100");
    $("#panel").innerHTML = '<section class="report-workspace"><header class="report-hero"><div><h2>Report review queue</h2><p>Prioritise incoming issues, document decisions and keep reporters informed.</p></div>' + reportStats(adminReportData) + '</header><article class="report-list-panel"><header class="report-panel-head"><div><h3>All reports</h3><span>Filter the queue, then save a status and review note.</span></div><div class="report-filters"><input id="report-search" type="search" placeholder="Search reports"><select id="report-status-filter"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Under Review">Under review</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option></select><select id="report-severity-filter"><option value="All">All priorities</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div></header><div id="admin-report-list" class="report-card-list"></div></article></section>';
    ["#report-search", "#report-status-filter", "#report-severity-filter"].forEach((selector) => {
        $(selector).addEventListener(selector === "#report-search" ? "input" : "change", () => renderAdminReports(adminReportData));
    });
    renderAdminReports(adminReportData);
}

async function saveReport(id, status, adminNote) {
    try {
        await R("/reports/" + id + "/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, adminNote: adminNote.trim() }) });
        say("Review saved and the reporter has been notified.");
        await adminReports();
    } catch (error) {
        say(error.message, true);
    }
}

async function myGrounds() {
    const grounds = await R("/playgrounds/my-playgrounds");
    $("#panel").innerHTML = grounds.length ? grounds.map((ground) => '<article class="card"><span class="badge">' + E(ground.status) + " · " + (ground.isApproved ? "Approved" : "Pending approval") + "</span><h3>" + E(ground.name) + "</h3><p>" + E(ground.sportType) + " · " + E(ground.address) + "<br>Morning ৳" + (ground.pricing?.morning ?? "—") + ", Evening ৳" + (ground.pricing?.evening ?? "—") + '</p><div class="card-foot"><button onclick="editGround(\'' + ground._id + '\')">Edit details</button><button class="alt" onclick="removeGround(\'' + ground._id + '\')">Delete</button></div></article>').join("") : '<div class="empty">Create your first playground from the dashboard.</div>';
}
window.editGround = async (id) => {
    const ground = (await R("/playgrounds/my-playgrounds")).find((item) => item._id === id);
    const name = prompt("Playground name", ground.name);
    if (!name) return;
    try { await R("/playgrounds/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); say("Playground updated."); myGrounds(); } catch (error) { say(error.message, true); }
};
window.removeGround = async (id) => {
    if (!confirm("Delete this playground?")) return;
    try { await R("/playgrounds/" + id, { method: "DELETE" }); say("Playground deleted."); myGrounds(); } catch (error) { say(error.message, true); }
};

async function slots() {
    const grounds = await R("/playgrounds/my-playgrounds");
    const all = [];
    for (const ground of grounds) all.push(...(await R("/slots/playground/" + ground._id)).map((slot) => ({ ...slot, ground: ground.name })));
    $("#panel").innerHTML = all.length ? all.map((slot) => '<article class="card"><span class="badge">' + (slot.isActive ? "Active" : "Inactive") + "</span><h3>" + E(slot.ground) + "</h3><p>Day " + slot.dayOfWeek + " · " + E(slot.startTime) + " – " + E(slot.endTime) + '</p><div class="card-foot"><button class="alt" onclick="deleteSlot(\'' + slot._id + '\')">Remove slot</button></div></article>').join("") : '<div class="empty">No slots yet. Add slots from dashboard.</div>';
}
window.deleteSlot = async (id) => {
    if (!confirm("Remove this slot?")) return;
    try { await R("/slots/" + id, { method: "DELETE" }); say("Slot removed."); slots(); } catch (error) { say(error.message, true); }
};

async function professionalSlots() {
    const grounds = await R("/playgrounds/my-playgrounds");
    const groups = await Promise.all(grounds.map(async (ground) => ({ ground, slots: await R("/slots/playground/" + ground._id) })));
    const header = '<header class="management-toolbar"><div><h2>Slot schedules</h2><p>Availability is organised separately for every playground.</p></div></header>';
    const content = groups.length ? groups.map(({ ground, slots: venueSlots }) => '<section class="venue-slot-group"><header><div><span>PLAYGROUND</span><h2>' + E(ground.name) + '</h2><p>' + E(ground.address || "Address pending") + '</p></div><strong>' + venueSlots.filter((slot) => slot.isActive).length + ' active slots</strong></header><div class="venue-slot-list">' + (venueSlots.length ? venueSlots.map((slot) => '<article class="slot-record"><div><span class="badge">' + (slot.isActive ? "Active" : "Inactive") + '</span><strong>Day ' + E(slot.dayOfWeek) + ' · ' + E(slot.startTime) + ' – ' + E(slot.endTime) + '</strong></div><button class="alt" onclick="deleteSlot(\'' + slot._id + '\')">Remove</button></article>').join("") : '<p class="empty">No slots configured for this playground.</p>') + '</div></section>').join("") : '<div class="empty">Add a playground before creating its slots.</div>';
    $("#panel").innerHTML = header + content;
}

async function bookings() {
    if (role === "customer") {
        const all = await R("/bookings/my-bookings");
        $("#panel").innerHTML = all.length ? all.map((booking) => '<article class="card"><span class="badge">' + E(booking.bookingStatus) + " · " + E(booking.paymentStatus) + "</span><h3>" + E(booking.playground?.name || "Playground booking") + "</h3><p>" + E(formatDate(booking.bookingDate)) + "<br>" + E(booking.startTime) + " – " + E(booking.endTime) + '</p></article>').join("") : '<div class="empty">You have no bookings yet.</div>';
        return;
    }
    const grounds = await R("/playgrounds/my-playgrounds");
    const all = [];
    for (const ground of grounds) all.push(...(await R("/bookings/playground/" + ground._id)).map((booking) => ({ ...booking, ground: ground.name })));
    $("#panel").innerHTML = all.length ? all.map((booking) => '<article class="card"><span class="badge">' + E(booking.bookingStatus) + " · " + E(booking.paymentStatus) + "</span><h3>" + E(booking.ground) + "</h3><p>" + E(booking.customer?.name || "Customer") + " · " + E(formatDate(booking.bookingDate)) + "<br>" + E(booking.startTime) + " – " + E(booking.endTime) + "</p></article>").join("") : '<div class="empty">No playground bookings.</div>';
}

const localDateKey = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

async function dailySlots(dateValue = localDateKey(new Date())) {
    const grounds = await R("/playgrounds/my-playgrounds");
    const selectedDate = new Date(dateValue + "T12:00:00");
    const dayOfWeek = selectedDate.getDay();
    const groups = await Promise.all(grounds.map(async (ground) => {
        const [venueSlots, venueBookings] = await Promise.all([R("/slots/playground/" + ground._id), R("/bookings/playground/" + ground._id)]);
        const bookingsForDay = venueBookings.filter((booking) => localDateKey(booking.bookingDate) === dateValue && ["Pending", "Confirmed"].includes(booking.bookingStatus));
        return { ground, venueSlots: venueSlots.filter((slot) => slot.dayOfWeek === dayOfWeek && slot.isActive), bookingsForDay };
    }));
    const header = '<header class="management-toolbar daily-schedule-toolbar"><div><h2>Daily slot availability</h2><p>Choose a date to see exactly which slots are available or booked.</p></div><label>Schedule date<input id="slot-schedule-date" type="date" value="' + E(dateValue) + '" min="' + E(localDateKey(new Date())) + '"></label></header>';
    const content = groups.length ? groups.map(({ ground, venueSlots, bookingsForDay }) => {
        const bookedCount = bookingsForDay.length;
        const cards = venueSlots.length ? venueSlots.map((slot) => {
            const booking = bookingsForDay.find((item) => item.startTime === slot.startTime && item.endTime === slot.endTime);
            return booking ? '<article class="daily-slot booked"><div><span>BOOKED</span><strong>' + E(slot.startTime) + ' – ' + E(slot.endTime) + '</strong><small>' + E(booking.customer?.name || "Customer") + ' · ' + E(booking.paymentStatus || booking.bookingStatus) + '</small></div><b>Reserved</b></article>' : '<article class="daily-slot available"><div><span>AVAILABLE</span><strong>' + E(slot.startTime) + ' – ' + E(slot.endTime) + '</strong><small>' + (slot.price ? '৳' + E(slot.price) : 'Open for booking') + '</small></div><b>Open</b></article>';
        }).join("") : '<p class="empty">No active slots are scheduled for this day.</p>';
        return '<section class="daily-venue"><header><div><span>PLAYGROUND</span><h2>' + E(ground.name) + '</h2><p>' + E(ground.address || "Address pending") + '</p></div><strong>' + bookedCount + ' booked</strong></header><div class="daily-slot-grid">' + cards + '</div></section>';
    }).join("") : '<div class="empty">No playground has been added yet.</div>';
    $("#panel").innerHTML = header + content;
    $("#slot-schedule-date").onchange = (event) => dailySlots(event.target.value);
}

async function users() {
    const users = await R("/users");
    $("#panel").innerHTML = users.map((item) => '<article class="card"><span class="badge">' + E(item.role) + "</span><h3>" + E(item.name) + "</h3><p>" + E(item.email) + "<br>" + (item.isBlocked ? "Blocked" : "Active") + '</p><div class="card-foot">' + (item.role !== "super-admin" ? '<button onclick="block(&quot;' + item._id + '&quot;,' + item.isBlocked + ')">' + (item.isBlocked ? "Unblock" : "Block") + "</button>" : "") + "</div></article>").join("");
}

async function income() {
    const data = await R("/payments/playground-admin/income");
    const money = (value) => "৳" + new Intl.NumberFormat("en-BD").format(value || 0);
    const row = (item, type) => '<article class="income-row"><div><span>' + E(type) + '</span><strong>' + E(type === "Slot" ? item.playground : item.tournament) + '</strong><small>' + E(type === "Slot" ? `${formatDate(item.date)} · ${item.startTime}–${item.endTime}` : `${item.team} · ${item.playground}`) + '</small></div><b>' + money(item.amount) + '</b></article>';
    $("#panel").innerHTML = '<section class="income-summary"><article><span>Slot income</span><strong>' + money(data.slotTotal) + '</strong></article><article><span>Tournament income</span><strong>' + money(data.tournamentTotal) + '</strong></article><article class="income-total"><span>Total income</span><strong>' + money(data.total) + '</strong></article></section><section class="income-section"><h2>Slot booking income</h2><div>' + (data.slots.length ? data.slots.map((item) => row(item, "Slot")).join("") : '<p class="empty">No paid slot bookings yet.</p>') + '</div></section><section class="income-section"><h2>Tournament income</h2><div>' + (data.tournaments.length ? data.tournaments.map((item) => row(item, "Tournament")).join("") : '<p class="empty">No paid tournament registrations yet.</p>') + '</div></section>';
}
window.block = async (id, blocked) => {
    try { await R("/users/" + (blocked ? "unblock/" : "block/") + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }); say(blocked ? "User unblocked." : "User blocked."); users(); } catch (error) { say(error.message, true); }
};

async function superGrounds() {
    const grounds = await R("/playgrounds/admin/all");
    $("#panel").innerHTML = grounds.map((ground) => '<article class="card"><span class="badge">' + (ground.isApproved ? "Approved" : "Pending") + " · " + E(ground.status) + "</span><h3>" + E(ground.name) + "</h3><p>" + E(ground.playgroundAdmin?.name || "Owner") + " · " + E(ground.address) + '</p><div class="card-foot">' + (!ground.isApproved ? '<button onclick="groundAction(&quot;' + ground._id + '&quot;,&quot;approve&quot;)">Approve</button>' : "") + '<button class="alt" onclick="groundAction(&quot;' + ground._id + '&quot;,&quot;' + (ground.status === "Active" ? "deactivate" : "activate") + '&quot;)">' + (ground.status === "Active" ? "Deactivate" : "Activate") + "</button></div></article>").join("");
    $("#panel").querySelectorAll(".card").forEach((card, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "alt";
        button.textContent = "View details";
        button.onclick = () => viewGround(grounds[index]._id);
        card.querySelector(".card-foot").prepend(button);
    });
}
window.groundAction = async (id, action) => {
    try { await R("/playgrounds/" + id + "/" + action, { method: "PATCH" }); say("Playground " + action + "d."); superGrounds(); } catch (error) { say(error.message, true); }
};
window.viewGround = async (id) => {
    try {
        const ground = await R("/playgrounds/" + id);
        const price = (value) => "৳" + new Intl.NumberFormat("en-BD").format(value || 0);
        const images = [ground.coverImage, ...(ground.galleryImages || [])].filter(Boolean);
        const modal = document.createElement("div");
        modal.className = "modal show";
        modal.innerHTML = `<section class="modal-box"><button class="close" type="button">Close</button><span class="badge">${E(ground.isApproved ? "Approved" : "Pending approval")} · ${E(ground.status)}</span><h2>${E(ground.name)}</h2><p class="meta">${E(ground.sportType)} · ${E(ground.maxPlayers)} max players · ${E(ground.openingTime)}–${E(ground.closingTime)}</p>${images.length ? `<div class="ground-detail-images">${images.map((image) => `<img src="${E(image)}" alt="${E(ground.name)}">`).join("")}</div>` : ""}<h3>About this playground</h3><p class="meta">${E(ground.description || "No description provided.")}</p><div class="ground-detail-grid"><div><b>Location</b><span>${E([ground.address, ground.area, ground.district, ground.division].filter(Boolean).join(", "))}</span></div><div><b>Venue contact</b><span>${E(ground.phone)}<br>${E(ground.email)}</span></div><div><b>Playground admin</b><span>${E(ground.playgroundAdmin?.name || "Not available")}<br>${E(ground.playgroundAdmin?.email || "")}</span></div><div><b>Facilities</b><span>${E((ground.facilities || []).join(", ") || "Not listed")}</span></div></div><h3>Pricing</h3><div class="ground-detail-grid"><div><b>Morning</b><span>${price(ground.pricing?.morning)}</span></div><div><b>Day</b><span>${price(ground.pricing?.day)}</span></div><div><b>Evening</b><span>${price(ground.pricing?.evening)}</span></div><div><b>Weekend</b><span>${price(ground.pricing?.weekend)}</span></div></div>${ground.googleMapLocation ? `<a class="button alt" target="_blank" rel="noopener" href="${E(ground.googleMapLocation)}">Open map location</a>` : ""}</section>`;
        document.body.append(modal);
        modal.querySelector(".close").onclick = () => modal.remove();
        modal.onclick = (event) => { if (event.target === modal) modal.remove(); };
    } catch (error) { say(error.message, true); }
};

const loaders = { Profile: profile, Reports: role === "super-admin" ? adminReports : reports, Playgrounds: role === "super-admin" ? superGrounds : myGrounds, Slots: dailySlots, Bookings: bookings, Income: income, Users: users };
$("#tabs").onclick = (event) => {
    const tab = event.target.dataset.tab;
    if (!tab) return;
    document.querySelectorAll(".tabs button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
    setTitle(tab);
    const url = new URL(location.href);
    url.searchParams.set("tab", tab);
    url.searchParams.delete("status");
    history.replaceState({}, "", url);
    loaders[tab]().catch((error) => say(error.message, true));
};
$("#logout").onclick = () => { localStorage.clear(); location.replace("login.html"); };
loaders[initialTab]().catch((error) => say(error.message, true));
