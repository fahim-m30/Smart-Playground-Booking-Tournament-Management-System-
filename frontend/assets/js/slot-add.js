const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
const user = safeUser();

function safeUser() {
    try { return JSON.parse(localStorage.getItem("authUser")) || null; }
    catch { return null; }
}

function escapeHTML(value = "") {
    const box = document.createElement("div");
    box.textContent = value;
    return box.innerHTML;
}

function authFetch(path, options = {}) {
    return fetch(`${API_ROOT}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
}

async function api(path) {
    const res = await authFetch(path);
    if (!res.ok) throw new Error("Could not load data");
    const json = await res.json();
    return json.data || [];
}

async function loadPlaygrounds() {
    try {
        const grounds = await api("/playgrounds/my-playgrounds");
        const select = document.getElementById("playground");

        if (!grounds.length) {
            document.getElementById("prerequisite-warning").hidden = false;
            document.getElementById("slot-form-card").hidden = true;
            return;
        }

        document.getElementById("prerequisite-warning").hidden = true;
        document.getElementById("slot-form-card").hidden = false;

        grounds.forEach(g => {
            const option = document.createElement("option");
            option.value = g._id;
            option.textContent = escapeHTML(g.name);
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load playgrounds:", error);
    }
}

document.getElementById("slot-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const messageEl = document.getElementById("slot-form-message");
    const payload = Object.fromEntries(new FormData(form));

    const openingTime = payload.openingTime;
    const closingTime = payload.closingTime;
    const slotsPerDay = parseInt(payload.slotsPerDay, 10);
    const slotDuration = parseInt(payload.slotDuration, 10);
    const playgroundId = payload.playground;
    const sportType = payload.sportType;
    const dayType = payload.dayType || "all";
    const pricePerSlot = Number(payload.pricePerSlot);
    const isActive = payload.isActive === "true";

    if (!playgroundId) {
        messageEl.textContent = "Please select a playground.";
        return;
    }

    if (!Number.isInteger(slotsPerDay) || slotsPerDay < 1 || !Number.isInteger(slotDuration) || slotDuration < 30) {
        messageEl.textContent = "Choose a valid slot count and duration.";
        return;
    }
    const openingMinutes = openingTime.split(":").reduce((total, value, index) => total + Number(value) * (index === 0 ? 60 : 1), 0);
    const closingMinutes = closingTime.split(":").reduce((total, value, index) => total + Number(value) * (index === 0 ? 60 : 1), 0);
    if (closingMinutes <= openingMinutes || slotsPerDay * slotDuration > closingMinutes - openingMinutes) {
        messageEl.textContent = "The selected number of slots does not fit between opening and closing time.";
        return;
    }

    messageEl.textContent = "Generating slots…";

    const days = [];
    if (dayType === "all") {
        for (let i = 0; i < 7; i++) days.push(i);
    } else if (dayType === "weekdays") {
        days.push(0, 1, 2, 3, 4);
    } else {
        days.push(5, 6);
    }

    const slots = [];
    for (const day of days) {
        const [openH, openM] = openingTime.split(":").map(Number);
        const [closeH, closeM] = closingTime.split(":").map(Number);
        let current = openH * 60 + openM;
        const end = closeH * 60 + closeM;

        for (let i = 0; i < slotsPerDay && (current + slotDuration) <= end; i++) {
            const startH = Math.floor(current / 60);
            const startM = current % 60;
            const slotEnd = current + slotDuration;
            const endH = Math.floor(slotEnd / 60);
            const endM = slotEnd % 60;

            const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            slots.push({
                playground: playgroundId,
                dayOfWeek: day,
                startTime: fmt(startH, startM),
                endTime: fmt(endH, endM),
                durationMinutes: slotDuration,
                price: pricePerSlot,
                isActive
            });

            current = slotEnd;
        }
    }

    try {
        const response = await authFetch("/slots/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slots })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        messageEl.textContent = `${slots.length} slots generated successfully.`;
        form.reset();
    } catch (error) {
        messageEl.textContent = error.message || "Could not generate slots.";
    }
});

loadPlaygrounds();
