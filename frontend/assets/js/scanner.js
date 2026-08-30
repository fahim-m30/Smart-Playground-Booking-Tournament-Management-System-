(() => {
    const API = "https://smart-playground-booking-tournament.onrender.com/api/v1";
    const token = localStorage.getItem("authToken");
    let user = null;
    try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { /* Redirect below. */ }
    if (!token || user?.role !== "playground-admin") { location.replace("login.html"); return; }

    const $ = (selector) => document.querySelector(selector);
    const status = $("#camera-status");
    const state = $("#scanner-state");
    const result = $("#result");
    const reader = $("#qr-reader");
    const cameraSelect = $("#camera-select");
    const startButton = $("#start-camera");
    const stopButton = $("#stop-camera");
    let qrScanner = null;
    let scannerRunning = false;
    let validating = false;
    let lastValue = "";
    let lastScanAt = 0;

    const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const setState = (kind, text) => { state.className = `state ${kind}`; state.textContent = text; };
    const setResult = (kind, title, message, details = "") => {
        result.className = `result ${kind}`;
        result.innerHTML = `<strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p>${details}`;
    };
    const showReaderPlaceholder = () => {
        reader.innerHTML = '<div class="reader-placeholder"><span aria-hidden="true">&#x2315;</span><strong>Camera is off</strong><small>Tap &ldquo;Start QR scanner&rdquo; to scan a ticket</small></div>';
    };
    const beep = (success) => {
        try {
            const audio = new (window.AudioContext || window.webkitAudioContext)();
            const tone = audio.createOscillator();
            const volume = audio.createGain();
            tone.frequency.value = success ? 880 : 220;
            volume.gain.setValueAtTime(0.05, audio.currentTime);
            volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
            tone.connect(volume); volume.connect(audio.destination); tone.start(); tone.stop(audio.currentTime + 0.15);
        } catch (_) { /* Audio feedback is optional. */ }
    };
    const ticketDetails = (data) => {
        const isSlot = data.type === "SlotBooking";
        const person = isSlot ? data.customerName : data.teamName;
        const schedule = isSlot ? `${data.date} - ${data.startTime}-${data.endTime}` : (data.tournament?.name || "Tournament");
        return `<dl><div><dt>Ticket</dt><dd>${isSlot ? "Slot booking" : "Tournament"}</dd></div><div><dt>${isSlot ? "Customer" : "Team"}</dt><dd>${escapeHTML(person || "-")}</dd></div><div><dt>Venue</dt><dd>${escapeHTML(data.playground?.name || "-")}</dd></div><div><dt>Schedule</dt><dd>${escapeHTML(schedule)}</dd></div></dl>`;
    };
    const validateTicket = async (qrData) => {
        if (!qrData || validating) return;
        const now = Date.now();
        if (qrData === lastValue && now - lastScanAt < 1800) return;
        lastValue = qrData;
        lastScanAt = now;
        validating = true;
        if (scannerRunning) status.textContent = "QR detected. Validating ticket...";
        setResult("loading", "Validating ticket", "Checking signature, payment, venue and eligibility...");
        try {
            const response = await fetch(`${API}/payments/validate-qr`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ qrData }),
            });
            const body = await response.json().catch(() => ({}));
            if (response.status === 401 || response.status === 403) { location.replace("login.html"); return; }
            if (!response.ok || !body.success) {
                beep(false);
                const ticketType = body.data?.type === "SlotBooking" ? "Slot booking" : body.data?.type === "TournamentTicket" ? "Tournament ticket" : "QR ticket";
                setResult("error", `${ticketType} invalid`, body.message || "Ticket could not be validated.", body.data ? ticketDetails(body.data) : "");
                return;
            }
            beep(true);
            const ticketType = body.data?.type === "SlotBooking" ? "Authenticated slot booking" : "Authenticated tournament ticket";
            setResult("success", ticketType, body.message, ticketDetails(body.data));
        } catch (error) {
            beep(false);
            setResult("error", "Ticket declined", error.message || "Ticket could not be validated.");
        } finally {
            validating = false;
            if (scannerRunning) status.textContent = "Scanning continuously - ready for the next QR code.";
        }
    };
    const stopScanner = () => {
        if (!qrScanner) return;
        try { qrScanner.stop(); qrScanner.destroy(); } catch (_) { /* The camera may already be closed. */ }
        qrScanner = null;
        scannerRunning = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        status.textContent = "Scanner stopped.";
        setState("idle", "Idle");
        showReaderPlaceholder();
    };
    const populateCameras = async () => {
        if (!window.QrScanner) return;
        const cameras = await window.QrScanner.listCameras(true);
        if (!cameras.length) return;
        cameraSelect.innerHTML = '<option value="environment">Back camera (recommended)</option>' + cameras.map((camera) => `<option value="${escapeHTML(camera.id)}">${escapeHTML(camera.label)}</option>`).join("");
    };
    const cameraErrorMessage = (error) => {
        const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
        if (text.includes("notallowed") || text.includes("permission") || text.includes("security")) return "Camera permission was blocked. Allow Camera in your browser settings, then try again.";
        if (text.includes("notfound") || text.includes("no camera")) return "No camera was found on this device. You can scan a saved QR image instead.";
        if (text.includes("notreadable") || text.includes("in use")) return "Your camera is being used by another app or browser tab. Close it, then try again.";
        return "Camera could not start. Open the deployed HTTPS site and try again.";
    };
    const startScanner = async () => {
        if (scannerRunning) return;
        if (!window.QrScanner) {
            setResult("error", "Scanner could not load", "Check your internet connection, then reload this page.");
            return;
        }
        if (!window.isSecureContext) {
            setState("error", "HTTPS required");
            setResult("error", "Camera needs HTTPS", "Open this page from the deployed HTTPS URL. Mobile browsers block camera access on insecure sites.");
            return;
        }
        stopScanner();
        startButton.disabled = true;
        status.textContent = "Opening back camera...";
        try {
            const video = document.createElement("video");
            video.setAttribute("playsinline", "true");
            video.setAttribute("webkit-playsinline", "true");
            video.muted = true;
            reader.replaceChildren(video);
            qrScanner = new window.QrScanner(video, (scanResult) => validateTicket(scanResult?.data || scanResult), {
                returnDetailedScanResult: true,
                preferredCamera: cameraSelect.value || "environment",
                maxScansPerSecond: 15,
                highlightScanRegion: true,
                highlightCodeOutline: true,
                onDecodeError: () => {},
            });
            await qrScanner.start();
            scannerRunning = true;
            stopButton.disabled = false;
            setState("active", "Scanning");
            status.textContent = "Scanning continuously - point the camera at any QR code.";
            await populateCameras();
        } catch (error) {
            try { qrScanner?.destroy(); } catch (_) { /* Ignore an incomplete scanner setup. */ }
            qrScanner = null;
            scannerRunning = false;
            startButton.disabled = false;
            stopButton.disabled = true;
            showReaderPlaceholder();
            setState("error", "Unavailable");
            status.textContent = "Camera could not start.";
            setResult("error", "Camera unavailable", cameraErrorMessage(error));
        }
    };
    const scanImage = async (file) => {
        if (!file) return;
        if (!window.QrScanner) { setResult("error", "Image scanner unavailable", "Reload the page while connected to the internet."); return; }
        try {
            stopScanner();
            status.textContent = "Reading QR image...";
            setState("active", "Reading image");
            const scanResult = await window.QrScanner.scanImage(file, { returnDetailedScanResult: true });
            await validateTicket(scanResult?.data || scanResult);
            status.textContent = "Ready to scan another ticket.";
            setState("idle", "Ready");
        } catch (_) {
            setResult("error", "Image could not be scanned", "Use a clear, uncropped image of a QR code and try again.");
            setState("error", "Scan failed");
        }
    };

    startButton.addEventListener("click", startScanner);
    stopButton.addEventListener("click", stopScanner);
    reader.addEventListener("click", () => { if (!scannerRunning) startScanner(); });
    reader.addEventListener("keydown", (event) => {
        if (!scannerRunning && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); startScanner(); }
    });
    cameraSelect.addEventListener("change", async () => {
        if (!scannerRunning || !qrScanner) return;
        try {
            status.textContent = "Switching camera...";
            await qrScanner.setCamera(cameraSelect.value);
            status.textContent = "Scanning continuously - ready for a QR code.";
        } catch (error) { setResult("error", "Camera switch failed", cameraErrorMessage(error)); }
    });
    $("#qr-image").addEventListener("change", async (event) => { await scanImage(event.target.files?.[0]); event.target.value = ""; });
    $("#manual-form").addEventListener("submit", (event) => { event.preventDefault(); validateTicket($("#qr-data").value.trim()); });
    window.addEventListener("pagehide", stopScanner);
})();
