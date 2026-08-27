(() => {
    const safeUser = () => {
        try { return JSON.parse(localStorage.getItem("authUser") || "null"); } catch (_) { return null; }
    };
    const user = safeUser();
    const token = localStorage.getItem("authToken");
    const loggedIn = Boolean(token && user?.role);
    const dashboardHref = "dashboard.html";

    const login = document.querySelector("#nav-login");
    const register = document.querySelector("#nav-register");
    if (loggedIn && login && register) {
        login.href = dashboardHref;
        login.textContent = "Dashboard";
        register.href = "#";
        register.textContent = "Log out";
        register.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.removeItem("authToken");
            localStorage.removeItem("authUser");
            location.reload();
        });
    }

    const form = document.querySelector("#hero-search-form");
    const input = document.querySelector("#hero-search-input");
    const searchType = document.querySelector("#hero-search-type");
    const updateSearchPlaceholder = () => {
        if (input) input.placeholder = searchType?.value === "tournaments" ? "Search tournaments..." : "Search playgrounds...";
    };
    searchType?.addEventListener("change", updateSearchPlaceholder);
    updateSearchPlaceholder();
    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const search = input.value.trim();
        const destination = searchType?.value === "tournaments" ? "tournament.html" : "playgrounds.html";
        location.href = destination + (search ? "?search=" + encodeURIComponent(search) : "");
    });

    if (loggedIn) {
        const actions = document.querySelector("#role-actions");
        const dashboard = document.querySelector("#role-dashboard-link");
        actions.hidden = false;
        dashboard.textContent = user.role === "super-admin" ? "Admin Dashboard" : user.role === "playground-admin" ? "Owner Dashboard" : "My Dashboard";
    }

    // The home gallery is populated from approved venue photos.  The static
    // imagery in the HTML remains as a graceful fallback if the API is down
    // or there are no active playgrounds yet.
    const galleryTracks = [...document.querySelectorAll(".gallery .track")];
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
    const renderVenueGallery = (playgrounds) => {
        const images = playgrounds.flatMap((ground) => [ground.coverImage, ...(Array.isArray(ground.galleryImages) ? ground.galleryImages : [])]
            .filter(Boolean)
            .map((image) => ({ image, name: ground.name, sport: ground.sportType, id: ground._id })));
        if (!images.length) return;

        galleryTracks.forEach((track, row) => {
            const rowImages = images.filter((_, index) => index % galleryTracks.length === row);
            const items = rowImages.length ? rowImages : images;
            // Repeat once so the existing marquee animation loops without a gap.
            track.innerHTML = [...items, ...items].map((item) => `<a class="gallery-item" href="playgrounds.html?search=${encodeURIComponent(item.name)}" aria-label="View ${escapeHtml(item.name)}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.sport || "Playground")}</small></span></a>`).join("");
        });
    };

    fetch("https://smart-playground-booking-tournament.onrender.com/api/v1/playgrounds?limit=30")
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Gallery data unavailable")))
        .then((body) => renderVenueGallery(body.data || []))
        .catch(() => { /* Keep the curated fallback photos already in the page. */ });
})();
