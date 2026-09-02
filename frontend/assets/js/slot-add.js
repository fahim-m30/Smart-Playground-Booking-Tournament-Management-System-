const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
const form = document.getElementById("slot-form");
const messageEl = document.getElementById("slot-form-message");
const submitButton = form.querySelector('button[type="submit"]');
const playgroundSelect = document.getElementById("playground");
const previewEl = document.getElementById("schedule-preview");
const previewCount = document.getElementById("preview-count");
const warningCard = document.getElementById("prerequisite-warning");
const formCard = document.getElementById("slot-form-card");

function safeUser() { try { return JSON.parse(localStorage.getItem("authUser")) || null; } catch { return null; } }
function setMessage(message = "", type = "") { messageEl.textContent = message; messageEl.className = `form-message ${type}`; }
function showPrerequisite(title = "No playground found", text = "You need to add a playground first before creating slots.") {
    formCard.hidden = true;
    warningCard.hidden = false;
    warningCard.querySelector("h3").textContent = title;
    warningCard.querySelector("p").textContent = text;
}
function showSlotForm() { warningCard.hidden = true; formCard.hidden = false; }

async function authFetch(path, options = {}) {
    const response = await fetch(`${API_ROOT}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Something went wrong. Please try again.");
    return body;
}

function selectedDays(type) { return type === "weekdays" ? [0, 1, 2, 3, 4] : type === "weekend" ? [5, 6] : [0, 1, 2, 3, 4, 5, 6]; }
function toMinutes(value) { const [hour, minute] = String(value || "").split(":").map(Number); return Number.isInteger(hour) && Number.isInteger(minute) ? hour * 60 + minute : NaN; }
function formatTime(value) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function breakWindow(values, opening, closing) {
    const hasStart = Boolean(values.breakStartTime), hasEnd = Boolean(values.breakEndTime);
    if (!hasStart && !hasEnd) return null;
    if (!hasStart || !hasEnd) return "invalid";
    const start = toMinutes(values.breakStartTime), end = toMinutes(values.breakEndTime);
    return Number.isFinite(start) && Number.isFinite(end) && start >= opening && end <= closing && end > start ? { start, end } : "invalid";
}

function buildSchedule() {
    const values = Object.fromEntries(new FormData(form));
    const start = toMinutes(values.openingTime), end = toMinutes(values.closingTime), duration = Number(values.slotDuration), count = Number(values.slotsPerDay);
    const breakTime = breakWindow(values, start, end);
    if (!Number.isInteger(duration) || duration < 30 || duration > 150 || !Number.isInteger(count) || count < 1 || count > 24 || end <= start || breakTime === "invalid") return [];

    const dailySlots = [];
    let cursor = start;
    while (dailySlots.length < count) {
        if (breakTime && cursor < breakTime.end && cursor + duration > breakTime.start) cursor = breakTime.end;
        if (cursor + duration > end) return [];
        dailySlots.push({
            startTime: formatTime(cursor), endTime: formatTime(cursor + duration), durationMinutes: duration,
            breakStartTime: values.breakStartTime || null, breakEndTime: values.breakEndTime || null,
        });
        cursor += duration;
    }
    return selectedDays(values.dayType).flatMap((dayOfWeek) => dailySlots.map((slot) => ({ ...slot, dayOfWeek })));
}

function updatePreview() {
    const slots = buildSchedule();
    const values = Object.fromEntries(new FormData(form));
    const hasBreak = values.breakStartTime && values.breakEndTime;
    previewCount.textContent = slots.length ? `${slots.length} slots will be created${hasBreak ? " around the break" : ""}` : "Check the schedule settings";
    previewEl.innerHTML = slots.length
        ? slots.slice(0, 8).map((slot) => `<span>${slot.startTime} – ${slot.endTime}</span>`).join("") + (hasBreak ? `<span class="preview-break">Break: ${values.breakStartTime} – ${values.breakEndTime}</span>` : "") + (slots.length > 8 ? `<span>+${slots.length - 8} more</span>` : "")
        : "<span>Set operating hours, duration, slot count, and break times to preview the schedule.</span>";
}

async function loadPlaygrounds() {
    if (!token || safeUser()?.role !== "playground-admin") return location.replace("login.html");
    submitButton.disabled = true;
    showPrerequisite();
    playgroundSelect.innerHTML = '<option value="">Choose one of your playgrounds</option>';
    try {
        const grounds = (await authFetch("/playgrounds/my-playgrounds")).data || [];
        if (!grounds.length) return;
        grounds.forEach((ground) => playgroundSelect.add(new Option(`${ground.name} · ${ground.sportType || "Sport"}`, ground._id)));
        if (grounds.length === 1) playgroundSelect.value = grounds[0]._id;
        showSlotForm();
        updatePreview();
    } catch (error) {
        showPrerequisite("Could not load your playgrounds", error.message || "Please refresh the page or add a playground first.");
    } finally { submitButton.disabled = false; }
}

form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form)), slots = buildSchedule(), price = Number(values.pricePerSlot);
    if (!values.playground) return setMessage("Please select a playground.", "error");
    if (!slots.length) return setMessage("Slots must fit within the selected operating hours. Check the break time if one is set.", "error");
    if (!Number.isFinite(price) || price < 0) return setMessage("Enter a valid non-negative price per slot.", "error");
    submitButton.disabled = true;
    setMessage("Creating your recurring schedule…", "loading");
    try {
        const schedule = slots.map((slot) => ({ ...slot, playground: values.playground, price, isActive: values.isActive === "true" }));
        const result = await authFetch("/slots/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slots: schedule }) });
        setMessage(result.message || `${schedule.length} slots created successfully.`, "success");
        form.reset();
        if (playgroundSelect.options.length === 2) playgroundSelect.selectedIndex = 1;
        updatePreview();
    } catch (error) { setMessage(error.message || "Could not create the schedule.", "error"); }
    finally { submitButton.disabled = false; }
});

loadPlaygrounds();
