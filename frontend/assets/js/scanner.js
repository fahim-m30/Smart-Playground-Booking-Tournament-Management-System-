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
    let nativeStream = null;
    let nativeVideo = null;
    let nativeDetector = null;
    let nativeScanFrame = null;
    let zxingReader = null;
    let zxingControls = null;
    let scannerRunning = false;
    let scannerStarting = false;
    let validating = false;
    let lastValue = "";
    let lastScanAt = 0;
    let lastDecodeHintAt = 0;

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
        if (scannerRunning) status.textContent = "QR code found. Validating ticket...";
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
        } finally {
            validating = false;
            if (scannerRunning) status.textContent = "Camera active — ready for the next QR code.";
        }
    };
    const stopScanner = async () => {
        if (!scanner && !nativeStream && !zxingControls) return;
        if (zxingControls) {
            try { zxingControls.stop(); } catch (_) { /* The camera may already be closed. */ }
            zxingControls = null;
            zxingReader = null;
            nativeVideo = null;
        } else if (nativeStream) {
            if (nativeScanFrame) cancelAnimationFrame(nativeScanFrame);
            nativeStream.getTracks().forEach((track) => track.stop());
            nativeStream = null;
            nativeVideo = null;
            nativeDetector = null;
            nativeScanFrame = null;
        } else {
            try {
                if (scannerRunning) await scanner.stop();
                await scanner.clear();
            } catch (_) { /* The camera may already be closed. */ }
        }
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
        if (text.includes("notreadable") || text.includes("could not start video") || text.includes("in use")) return "Your camera is being used by another app or browser tab. Close it, then try again.";
        if (text.includes("overconstrained") || text.includes("constraint")) return "The selected camera is unavailable. Choose another camera and try again.";
        return "Camera could not be opened. Allow camera permission, close other apps using the camera, then try again.";
    };
    const getScannerOptions = () => window.Html5QrcodeSupportedFormats ? { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] } : {};
    const clearIncompleteScanner = async () => {
        if (nativeScanFrame) cancelAnimationFrame(nativeScanFrame);
        nativeStream?.getTracks().forEach((track) => track.stop());
        nativeStream = null;
        nativeVideo = null;
        nativeDetector = null;
        nativeScanFrame = null;
        try { zxingControls?.stop(); } catch (_) { /* The camera may already be closed. */ }
        zxingControls = null;
        zxingReader = null;
        try { await scanner?.clear(); } catch (_) { /* A failed stream may not be clearable. */ }
        scanner = null;
    };
    const createNativeDetector = () => {
        if (typeof window.BarcodeDetector !== "function") return null;
        try { return new window.BarcodeDetector({ formats: ["qr_code"] }); } catch (_) { return null; }
    };
    const startNativeScanner = async (camera, detector) => {
        const videoConstraints = typeof camera === "string"
            ? { deviceId: { exact: camera }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { ...camera, width: { ideal: 1920 }, height: { ideal: 1080 } };
        nativeStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        nativeDetector = detector;
        reader.innerHTML = '<video class="native-scanner-video" autoplay muted playsinline></video><div class="native-scan-guide" aria-hidden="true"></div>';
        nativeVideo = reader.querySelector("video");
        nativeVideo.srcObject = nativeStream;
        await nativeVideo.play();
        const detectFrame = async () => {
            if (!nativeStream || !nativeVideo || !nativeDetector) return;
            if (nativeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !validating) {
                try {
                    const codes = await nativeDetector.detect(nativeVideo);
                    if (codes[0]?.rawValue) validateTicket(codes[0].rawValue);
                } catch (_) { /* Keep scanning; a frame can be unavailable while autofocus adjusts. */ }
            }
            nativeScanFrame = requestAnimationFrame(detectFrame);
        };
        nativeScanFrame = requestAnimationFrame(detectFrame);
    };
    const startZxingScanner = async (camera) => {
        zxingReader = new window.ZXingBrowser.BrowserQRCodeReader();
        reader.innerHTML = '<video class="native-scanner-video" autoplay muted playsinline></video><div class="native-scan-guide" aria-hidden="true"></div>';
        nativeVideo = reader.querySelector("video");
        const deviceId = typeof camera === "string" ? camera : undefined;
        zxingControls = await zxingReader.decodeFromVideoDevice(deviceId, nativeVideo, (scanResult) => {
            const qrData = scanResult?.getText?.();
            if (qrData) validateTicket(qrData);
        });
    };
    const scanConfiguration = {
        fps: 15,
        aspectRatio: 16 / 9,
        disableFlip: false,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.82);
            return { width: size, height: size };
        },
    };
    const startScanner = async () => {
        if (scannerRunning || scannerStarting) return;
        if (!window.Html5Qrcode && typeof window.BarcodeDetector !== "function" && !window.ZXingBrowser?.BrowserQRCodeReader) {
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
            startButton.disabled = true;
            const startWithCamera = async (camera) => {
                if (window.ZXingBrowser?.BrowserQRCodeReader) {
                    await startZxingScanner(camera);
                    return;
                }
                const detector = createNativeDetector();
                if (detector) {
                    await startNativeScanner(camera, detector);
                    return;
                }
                scanner = new Html5Qrcode("qr-reader", getScannerOptions());
                await scanner.start(camera, scanConfiguration, (decodedText) => validateTicket(decodedText), () => {
                    if (Date.now() - lastDecodeHintAt > 1800) {
                        lastDecodeHintAt = Date.now();
                        status.textContent = "Looking for a QR code — keep it centred and fill the frame.";
                    }
                });
            };
            const requestedCamera = cameraSelect.value || { facingMode: "environment" };
            status.textContent = "Requesting camera access…";
            try {
                await startWithCamera(requestedCamera);
            } catch (firstError) {
                await clearIncompleteScanner();
                if (cameraSelect.value || typeof Html5Qrcode.getCameras !== "function") throw firstError;
                const cameras = await Html5Qrcode.getCameras();
                const fallbackCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) || cameras[0];
                if (!fallbackCamera) throw firstError;
                await startWithCamera(fallbackCamera.id);
            }
            scannerRunning = true;
            startButton.disabled = true; stopButton.disabled = false;
            status.textContent = "Camera active — hold a QR code inside the frame.";
            setState("active", "Scanning");
            await populateCameras();
        } catch (error) {
            await clearIncompleteScanner();
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
            scanner ||= new Html5Qrcode("qr-reader", getScannerOptions());
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
