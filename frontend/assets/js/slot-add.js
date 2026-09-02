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
    formCard.hidden = true; warningCard.hidden = false;
    warningCard.querySelector("h3").textContent = title; warningCard.querySelector("p").textContent = text;
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
    const opening = toMinutes(values.openingTime), closing = toMinutes(values.closingTime);
    const duration = Number(values.slotDuration), requestedCount = Number(values.slotsPerDay);
    const breakTime = breakWindow(values, opening, closing);
    if (!Number.isInteger(duration) || duration < 30 || duration > 150 || !Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 24 || closing <= opening) return { slots: [], reason: "Check opening hours, slot duration, and slot count." };
    if (breakTime === "invalid") return { slots: [], reason: "Set both break times inside the opening hours, with the end after the start." };

    const dailySlots = [];
    let cursor = opening;
    while (dailySlots.length < requestedCount && cursor + duration <= closing) {
        if (breakTime && cursor < breakTime.end && cursor + duration > breakTime.start) cursor = breakTime.end;
        if (cursor + duration > closing) break;
        dailySlots.push({
            startTime: formatTime(cursor), endTime: formatTime(cursor + duration), durationMinutes: duration,
            breakStartTime: values.breakStartTime || null, breakEndTime: values.breakEndTime || null,
        });
        cursor += duration;
    }
    if (dailySlots.length < requestedCount) return { slots: [], reason: `${requestedCount} slots do not fit in this schedule. With these hours, duration, and break, you can create up to ${dailySlots.length} slots per day.` };
    return { slots: selectedDays(values.dayType).flatMap((dayOfWeek) => dailySlots.map((slot) => ({ ...slot, dayOfWeek }))), reason: "" };
}

function updatePreview() {
    const schedule = buildSchedule();
    const values = Object.fromEntries(new FormData(form));
    const hasBreak = values.breakStartTime && values.breakEndTime;
    previewCount.textContent = schedule.slots.length ? `${schedule.slots.length} slots will be created${hasBreak ? " around the break" : ""}` : schedule.reason;
    previewEl.innerHTML = schedule.slots.length
        ? schedule.slots.slice(0, 8).map((slot) => `<span>${slot.startTime} – ${slot.endTime}</span>`).join("") + (hasBreak ? `<span class="preview-break">Break: ${values.breakStartTime} – ${values.breakEndTime}</span>` : "") + (schedule.slots.length > 8 ? `<span>+${schedule.slots.length - 8} more</span>` : "")
        : `<span>${schedule.reason}</span>`;
}

async function loadPlaygrounds() {
    if (!token || safeUser()?.role !== "playground-admin") return location.replace("login.html");
    submitButton.disabled = true; showPrerequisite(); playgroundSelect.innerHTML = '<option value="">Choose one of your playgrounds</option>';
    try {
        const grounds = (await authFetch("/playgrounds/my-playgrounds")).data || [];
        if (!grounds.length) return;
        grounds.forEach((ground) => playgroundSelect.add(new Option(`${ground.name} · ${ground.sportType || "Sport"}`, ground._id)));
        if (grounds.length === 1) playgroundSelect.value = grounds[0]._id;
        showSlotForm(); updatePreview();
    } catch (error) { showPrerequisite("Could not load your playgrounds", error.message || "Please refresh the page or add a playground first."); }
    finally { submitButton.disabled = false; }
}

form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const scheduleState = buildSchedule();
    const morningPrice = Number(values.morningPrice), eveningPrice = Number(values.eveningPrice), eveningStart = toMinutes(values.eveningStartTime);
    if (!values.playground) return setMessage("Please select a playground.", "error");
    if (!scheduleState.slots.length) return setMessage(scheduleState.reason, "error");
    if (!Number.isFinite(morningPrice) || morningPrice < 0 || !Number.isFinite(eveningPrice) || eveningPrice < 0 || !Number.isFinite(eveningStart)) return setMessage("Enter valid morning and evening prices.", "error");
    submitButton.disabled = true; setMessage("Creating your recurring schedule…", "loading");
    try {
        const schedule = scheduleState.slots.map((slot) => ({
            ...slot, playground: values.playground,
            price: toMinutes(slot.startTime) >= eveningStart ? eveningPrice : morningPrice,
            isActive: values.isActive === "true",
        }));
        const result = await authFetch("/slots/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slots: schedule }) });
        setMessage(result.message || `${schedule.length} slots created successfully.`, "success");
        form.reset();
        if (playgroundSelect.options.length === 2) playgroundSelect.selectedIndex = 1;
        updatePreview();
    } catch (error) { setMessage(error.message || "Could not create the schedule.", "error"); }
    finally { submitButton.disabled = false; }
});

loadPlaygrounds();
