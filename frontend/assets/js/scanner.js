(() => {
    const API = "https://smart-playground-booking-tournament.onrender.com/api/v1";
    const token = localStorage.getItem("authToken");
    let user = null;
    try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { /* handled below */ }
    if (!token || user?.role !== "playground-admin") { location.replace("login.html"); return; }

    const video = document.querySelector("#camera");
    const status = document.querySelector("#camera-status");
    const result = document.querySelector("#result");
    const startButton = document.querySelector("#start-camera");
    const stopButton = document.querySelector("#stop-camera");
    let stream = null;
    let detector = null;
    let scanning = false;
    let validating = false;

    const escapeHTML = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const setResult = (kind, title, message, details = "") => {
        result.className = `result ${kind}`;
        result.innerHTML = `<strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p>${details}`;
    };
    const stopCamera = () => {
        scanning = false;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        video.srcObject = null;
        status.textContent = "Camera is off.";
    };
    const ticketDetails = (data) => {
        const venue = data.playground?.name || "Venue";
        const person = data.type === "SlotBooking" ? data.customerName : data.teamName;
        const schedule = data.type === "SlotBooking" ? `${data.date} · ${data.startTime}–${data.endTime}` : (data.tournament?.name || "Tournament");
        return `<dl><div><dt>Ticket</dt><dd>${escapeHTML(data.type === "SlotBooking" ? "Slot booking" : "Tournament")}</dd></div><div><dt>${data.type === "SlotBooking" ? "Customer" : "Team"}</dt><dd>${escapeHTML(person)}</dd></div><div><dt>Venue</dt><dd>${escapeHTML(venue)}</dd></div><div><dt>Schedule</dt><dd>${escapeHTML(schedule)}</dd></div></dl>`;
    };
    const validate = async (qrData) => {
        if (!qrData || validating) return;
        validating = true;
        setResult("loading", "Validating ticket", "Checking signature, payment, venue and check-in status…");
        try {
            const response = await fetch(`${API}/payments/validate-qr`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ qrData }) });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || !body.success) throw new Error(body.message || "Ticket could not be validated.");
            setResult("success", "Ticket valid", body.message, ticketDetails(body.data));
            stopCamera();
        } catch (error) {
            setResult("error", "Check-in declined", error.message || "Ticket could not be validated.");
        } finally { validating = false; }
    };
    const scanFrame = async () => {
        if (!scanning || !detector || validating) return;
        try {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue) { await validate(codes[0].rawValue); return; }
        } catch (_) { /* A frame can be unavailable while the camera starts. */ }
        if (scanning) requestAnimationFrame(scanFrame);
    };
    const startCamera = async () => {
        if (!("BarcodeDetector" in window)) {
            status.textContent = "This browser cannot scan from camera. Use Chrome/Edge or scan a QR image.";
            setResult("error", "Camera scanning unavailable", "Use a modern Chromium browser, or use the QR image/manual option.");
            return;
        }
        try {
            detector = new BarcodeDetector({ formats: ["qr_code"] });
            stopCamera();
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
            video.srcObject = stream;
            await video.play();
            scanning = true;
            status.textContent = "Camera ready — align the QR inside the frame.";
            requestAnimationFrame(scanFrame);
        } catch (error) {
            status.textContent = "Camera permission was not granted.";
            setResult("error", "Camera unavailable", error.message || "Allow camera access and try again.");
        }
    };

    startButton.addEventListener("click", startCamera);
    stopButton.addEventListener("click", stopCamera);
    document.querySelector("#manual-form").addEventListener("submit", (event) => { event.preventDefault(); validate(document.querySelector("#qr-data").value.trim()); });
    document.querySelector("#qr-image").addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!("BarcodeDetector" in window)) { setResult("error", "Image scanning unavailable", "Use Chrome or Edge to scan a QR image."); return; }
        try {
            detector ||= new BarcodeDetector({ formats: ["qr_code"] });
            const bitmap = await createImageBitmap(file);
            const codes = await detector.detect(bitmap);
            bitmap.close?.();
            if (!codes[0]?.rawValue) throw new Error("No readable QR code was found in this image.");
            await validate(codes[0].rawValue);
        } catch (error) { setResult("error", "Image could not be scanned", error.message); }
        event.target.value = "";
    });
    window.addEventListener("pagehide", stopCamera);
    startCamera();
})();
