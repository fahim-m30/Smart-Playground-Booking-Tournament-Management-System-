(() => {
    const API = "https://smart-playground-booking-tournament.onrender.com/api/v1";
    const token = localStorage.getItem("authToken");
    let user = null;
    try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { /* redirect below */ }
    if (!token || user?.role !== "playground-admin") { location.replace("login.html"); return; }

    const $ = (selector) => document.querySelector(selector);
    const status = $("#camera-status");
    const state = $("#scanner-state");
    const result = $("#result");
    const cameraSelect = $("#camera-select");
    const startButton = $("#start-camera");
    const stopButton = $("#stop-camera");
    const reader = $("#qr-reader");
    let scanner = null;
    let scannerRunning = false;
    let scannerStarting = false;
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
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.frequency.value = success ? 880 : 220;
            gain.gain.setValueAtTime(.05, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .14);
            oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .14);
        } catch (_) { /* Audio feedback is optional. */ }
    };
    const ticketDetails = (data) => {
        const isSlot = data.type === "SlotBooking";
        const person = isSlot ? data.customerName : data.teamName;
        const schedule = isSlot ? `${data.date} · ${data.startTime}–${data.endTime}` : (data.tournament?.name || "Tournament");
        return `<dl><div><dt>Ticket</dt><dd>${isSlot ? "Slot booking" : "Tournament"}</dd></div><div><dt>${isSlot ? "Customer" : "Team"}</dt><dd>${escapeHTML(person || "—")}</dd></div><div><dt>Venue</dt><dd>${escapeHTML(data.playground?.name || "—")}</dd></div><div><dt>Schedule</dt><dd>${escapeHTML(schedule)}</dd></div></dl>`;
    };
    const validateTicket = async (qrData) => {
        if (!qrData || validating) return;
        const now = Date.now();
        if (qrData === lastValue && now - lastScanAt < 1800) return;
        lastValue = qrData; lastScanAt = now; validating = true;
        setResult("loading", "Validating ticket", "Checking signature, payment, venue and eligibility…");
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
        } finally { validating = false; }
    };
    const stopScanner = async () => {
        if (!scanner) return;
        try {
            if (scannerRunning) await scanner.stop();
            await scanner.clear();
        } catch (_) { /* The camera may already be closed. */ }
        scanner = null;
        scannerRunning = false;
        startButton.disabled = false; stopButton.disabled = true;
        status.textContent = "Scanner stopped.";
        setState("idle", "Idle");
        showReaderPlaceholder();
    };
    const populateCameras = async () => {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        if (!cameras.length) return;
        cameraSelect.innerHTML = '<option value="">Back camera (recommended)</option>' + cameras.map((camera, index) => `<option value="${escapeHTML(camera.deviceId)}">${escapeHTML(camera.label || `Camera ${index + 1}`)}</option>`).join("");
    };
    const cameraErrorMessage = (error) => {
        const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
        if (text.includes("notallowed") || text.includes("permission") || text.includes("security")) return "Camera permission was blocked. Tap the lock icon in your browser, allow Camera, then try again.";
        if (text.includes("notfound") || text.includes("no camera")) return "No camera was found on this device. You can scan a saved QR image instead.";
        if (text.includes("overconstrained") || text.includes("constraint")) return "The selected camera is unavailable. Choose another camera and try again.";
        return "Camera access needs the deployed HTTPS site. Allow camera permission and try again.";
    };
    const startScanner = async () => {
        if (scannerRunning || scannerStarting) return;
        if (!window.Html5Qrcode) {
            setResult("error", "Scanner could not load", "Check your internet connection, then reload this page.");
            return;
        }
        if (!window.isSecureContext) {
            setState("error", "HTTPS required");
            setResult("error", "Camera needs HTTPS", "Open this page from the deployed HTTPS URL. Mobile browsers block camera access on insecure sites.");
            return;
        }
        scannerStarting = true;
        await stopScanner();
        try {
            const formats = window.Html5QrcodeSupportedFormats ? { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] } : {};
            scanner = new Html5Qrcode("qr-reader", formats);
            const camera = cameraSelect.value || { facingMode: { ideal: "environment" } };
            startButton.disabled = true;
            status.textContent = "Requesting camera access…";
            await scanner.start(camera, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 }, (decodedText) => validateTicket(decodedText), () => {});
            scannerRunning = true;
            startButton.disabled = true; stopButton.disabled = false;
            status.textContent = "Camera active — hold a QR code inside the frame.";
            setState("active", "Scanning");
            await populateCameras();
        } catch (error) {
            try { await scanner?.clear(); } catch (_) { /* Ignore an incomplete camera setup. */ }
            scanner = null;
            scannerRunning = false; startButton.disabled = false; stopButton.disabled = true;
            status.textContent = "Camera could not start.";
            setState("error", "Unavailable");
            showReaderPlaceholder();
            setResult("error", "Camera unavailable", cameraErrorMessage(error));
        } finally {
            scannerStarting = false;
        }
    };
    const scanImage = async (file) => {
        if (!file) return;
        if (!window.Html5Qrcode) { setResult("error", "Image scanner unavailable", "Reload the page while connected to the internet."); return; }
        try {
            await stopScanner();
            const formats = window.Html5QrcodeSupportedFormats ? { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] } : {};
            scanner ||= new Html5Qrcode("qr-reader", formats);
            status.textContent = "Reading QR image…"; setState("active", "Reading image");
            const decodedText = await scanner.scanFile(file, true);
            await validateTicket(decodedText);
            status.textContent = "Ready to scan another ticket."; setState("idle", "Ready");
        } catch (error) {
            setResult("error", "Image could not be scanned", "Use a clear, uncropped image of a QR code and try again.");
            setState("error", "Scan failed");
        }
    };

    startButton.addEventListener("click", startScanner);
    stopButton.addEventListener("click", stopScanner);
    reader.addEventListener("click", () => { if (!scannerRunning && !scannerStarting) startScanner(); });
    reader.addEventListener("keydown", (event) => {
        if (!scannerRunning && !scannerStarting && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); startScanner(); }
    });
    cameraSelect.addEventListener("change", () => { if (scannerRunning) startScanner(); });
    $("#qr-image").addEventListener("change", async (event) => { await scanImage(event.target.files?.[0]); event.target.value = ""; });
    $("#manual-form").addEventListener("submit", (event) => { event.preventDefault(); validateTicket($("#qr-data").value.trim()); });
    window.addEventListener("pagehide", () => { stopScanner(); });
    populateCameras().catch(() => {});
})();
