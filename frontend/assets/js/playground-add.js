const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
let user;
try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { user = null; }

const $ = (selector) => document.querySelector(selector);
const form = $("#playground-form");
const message = (text, error = false) => {
    const element = $("#form-message");
    element.textContent = text;
    element.style.color = error ? "#a53636" : "#065f46";
};
const isUsableImage = (file) => file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024;
const isMapUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

if (!token || !user?.role) location.replace("login.html");

function renderPreviews(files, target, limit) {
    const selected = Array.from(files || []).slice(0, limit);
    $(target).innerHTML = selected.map((file) => '<img src="' + URL.createObjectURL(file) + '" alt="Selected image preview">').join("");
}

function mapQuery() {
    return [$("#name").value, $("#address").value, $("#area").value, $("#district").value, $("#division").value]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(", ");
}

function refreshMapPreview() {
    const query = mapQuery();
    const shareLink = $("#map-share-link").value.trim();
    const mapLocation = $("#googleMapLocation");
    const status = $("#map-status");
    const external = $("#open-google-map");
    const preview = $("#venue-map-preview");

    if (isMapUrl(shareLink)) {
        mapLocation.value = shareLink;
        external.href = shareLink;
        status.textContent = "Exact pin selected";
        status.classList.add("is-selected");
    } else if (query) {
        const searchUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
        mapLocation.value = searchUrl;
        external.href = searchUrl;
        status.textContent = "Address location selected";
        status.classList.remove("is-selected");
    } else {
        mapLocation.value = "";
        external.href = "https://www.google.com/maps";
        status.textContent = "Location pending";
        status.classList.remove("is-selected");
    }

    preview.src = query ? "https://www.google.com/maps?q=" + encodeURIComponent(query) + "&output=embed" : "about:blank";
}

function setStep(step) {
    const isDetails = step === 1;
    $("#details-step").classList.toggle("is-active", isDetails);
    $("#photos-step").classList.toggle("is-active", !isDetails);
    $("#setup-count").textContent = step + " / 2";
    $("#setup-title").textContent = isDetails ? "Tell customers about your playground" : "Add photos that build customer trust";
    $("#setup-subtitle").textContent = isDetails
        ? "Add the venue details and confirm its location on Google Maps."
        : "Upload a cover image and optional gallery photos, then submit the venue for approval.";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateDetails() {
    const invalid = [...$("#details-step").querySelectorAll("[required]")].find((field) => !field.checkValidity());
    if (!invalid) return true;
    invalid.reportValidity();
    invalid.focus();
    return false;
}

$("#coverImage").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!isUsableImage(file)) {
        event.target.value = "";
        $("#cover-preview").innerHTML = "";
        message("Cover photo must be an image no larger than 5 MB.", true);
        return;
    }
    renderPreviews([file], "#cover-preview", 1);
});

$("#galleryImages").addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 5 || files.some((file) => !isUsableImage(file))) {
        event.target.value = "";
        $("#gallery-preview").innerHTML = "";
        message("Choose up to five image files, each no larger than 5 MB.", true);
        return;
    }
    renderPreviews(files, "#gallery-preview", 5);
});

$("#preview-map").addEventListener("click", refreshMapPreview);
$("#map-share-link").addEventListener("input", refreshMapPreview);
["#name", "#address", "#area", "#district", "#division"].forEach((selector) => $(selector).addEventListener("input", () => {
    if (!$("#map-share-link").value.trim()) refreshMapPreview();
}));

$("#continue-to-images").addEventListener("click", () => {
    if (!validateDetails()) return;
    refreshMapPreview();
    setStep(2);
});
$("#back-to-details").addEventListener("click", () => setStep(1));

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(form));
    const cover = $("#coverImage").files?.[0];
    const gallery = Array.from($("#galleryImages").files || []);

    if (!isUsableImage(cover)) return message("Add a valid cover photo before saving.", true);
    if (gallery.length > 5 || gallery.some((file) => !isUsableImage(file))) return message("Check your gallery images before saving.", true);
    refreshMapPreview();

    const data = new FormData();
    ["name", "sportType", "description", "address", "division", "district", "area", "openingTime", "closingTime", "maxPlayers"].forEach((field) => data.append(field, fields[field] || ""));
    data.append("phone", user.phone || "Not provided");
    data.append("email", user.email || "");
    data.append("facilities", fields.facilities || "");
    data.append("googleMapLocation", $("#googleMapLocation").value);
    const morning = Number(fields.morning);
    const evening = Number(fields.evening);
    data.append("pricing", JSON.stringify({ morning, day: morning, evening, weekend: evening }));
    data.append("coverImage", cover);
    gallery.forEach((file) => data.append("galleryImages", file));

    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    message("Uploading playground details and photos...");
    try {
        const response = await fetch(API_ROOT + "/playgrounds", { method: "POST", headers: { Authorization: "Bearer " + token }, body: data });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Could not save playground.");
        message("Playground saved with its cover photo. It is now waiting for approval.");
        form.reset();
        $("#cover-preview").innerHTML = "";
        $("#gallery-preview").innerHTML = "";
        refreshMapPreview();
        setTimeout(() => { location.href = "dashboard.html"; }, 1200);
    } catch (error) {
        message(error.message || "Could not save playground details.", true);
    } finally {
        submit.disabled = false;
    }
});

refreshMapPreview();
