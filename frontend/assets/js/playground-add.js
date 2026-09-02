const API_ROOT = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
let user;
try { user = JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { user = null; }

const $ = (selector) => document.querySelector(selector);
const message = (text, error = false) => {
    const element = $("#form-message");
    element.textContent = text;
    element.style.color = error ? "#a53636" : "#065f46";
};
const isUsableImage = (file) => file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024;

if (!token || !user?.role) location.replace("login.html");

function renderPreviews(files, target, limit) {
    const selected = Array.from(files || []).slice(0, limit);
    $(target).innerHTML = selected.map((file) => '<img src="' + URL.createObjectURL(file) + '" alt="Selected image preview">').join("");
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

$("#playground-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const cover = $("#coverImage").files?.[0];
    const gallery = Array.from($("#galleryImages").files || []);

    if (!isUsableImage(cover)) return message("Add a valid cover photo before saving.", true);
    if (gallery.length > 5 || gallery.some((file) => !isUsableImage(file))) return message("Check your gallery images before saving.", true);

    const data = new FormData();
    ["name", "sportType", "description", "address", "division", "district", "area", "openingTime", "closingTime", "maxPlayers"].forEach((field) => data.append(field, fields[field] || ""));
    data.append("phone", user.phone || "Not provided");
    data.append("email", user.email || "");
    data.append("facilities", fields.facilities || "");
    data.append("googleMapLocation", fields.googleMapLocation || "");
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
        setTimeout(() => { location.href = "dashboard.html"; }, 1200);
    } catch (error) {
        message(error.message || "Could not save playground details.", true);
    } finally {
        submit.disabled = false;
    }
});
