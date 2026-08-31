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

    const activePlaygrounds = document.querySelector("#home-active-playgrounds");
    const venueSummary = document.querySelector("#home-venue-summary");
    const apiRoot = "https://smart-playground-booking-tournament.onrender.com/api/v1";

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>'\"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        "\"": "&quot;",
    })[character]);

    const formatMoney = (amount) => new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

    const fetchActivePlaygrounds = async () => {
        if (!activePlaygrounds) return;

        try {
            const firstResponse = await fetch(`${apiRoot}/playgrounds?page=1&limit=50`);
            if (!firstResponse.ok) throw new Error("Unable to load playgrounds");

            const firstPage = await firstResponse.json();
            const firstGrounds = Array.isArray(firstPage.data) ? firstPage.data : [];
            const totalPages = Math.max(Number(firstPage.meta?.totalPage) || 1, 1);
            const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
            const remainingResults = await Promise.all(remainingPages.map(async (page) => {
                const response = await fetch(`${apiRoot}/playgrounds?page=${page}&limit=50`);
                if (!response.ok) throw new Error("Unable to load all playgrounds");
                const payload = await response.json();
                return Array.isArray(payload.data) ? payload.data : [];
            }));

            const grounds = firstGrounds.concat(...remainingResults);
            const verifiedActiveGrounds = grounds.filter((ground) => (
                ground?.status === "Active" && ground?.isApproved === true && ground?.isDeleted !== true
            ));

            if (venueSummary) {
                const count = verifiedActiveGrounds.length;
                venueSummary.textContent = count
                    ? `${count} active ${count === 1 ? "playground" : "playgrounds"} are ready for booking right now.`
                    : "No active playground is available for booking right now.";
            }

            activePlaygrounds.setAttribute("aria-busy", "false");

            if (!verifiedActiveGrounds.length) {
                activePlaygrounds.innerHTML = `<div class="home-venue-empty"><i class="fa-regular fa-calendar-xmark"></i><p>There are no active playgrounds at the moment. Please check back shortly.</p></div>`;
                return;
            }

            activePlaygrounds.innerHTML = verifiedActiveGrounds.map((ground) => {
                const name = escapeHtml(ground.name || "Playground");
                const sport = escapeHtml(ground.sportType || "Sports");
                const location = escapeHtml([ground.area, ground.district].filter(Boolean).join(", ") || ground.address || "Location details coming soon");
                const coverImage = ground.coverImage ? escapeHtml(ground.coverImage) : "";
                const rating = Number(ground.averageRating || 0);
                const ratingLabel = rating > 0 ? rating.toFixed(1) : "New";
                const searchUrl = `playgrounds.html?search=${encodeURIComponent(ground.name || "")}`;
                const image = coverImage
                    ? `<img src="${coverImage}" alt="${name}" loading="lazy" onerror="this.closest('.home-venue-image').classList.add('no-image');this.remove()">`
                    : "";

                return `<article class="home-venue-card">
                    <div class="home-venue-image${coverImage ? "" : " no-image"}">
                        ${image}
                        <span class="home-venue-status"><i class="fa-solid fa-circle"></i> Active</span>
                        <span class="home-venue-sport">${sport}</span>
                    </div>
                    <div class="home-venue-content">
                        <div class="home-venue-title-row">
                            <h3>${name}</h3>
                            <span class="home-venue-rating"><i class="fa-solid fa-star"></i> ${ratingLabel}</span>
                        </div>
                        <p class="home-venue-location"><i class="fa-solid fa-location-dot"></i> ${location}</p>
                        <div class="home-venue-meta">
                            <span><i class="fa-regular fa-clock"></i> ${escapeHtml(ground.openingTime || "—")}–${escapeHtml(ground.closingTime || "—")}</span>
                            <strong>From ${formatMoney(ground.pricing?.morning)}</strong>
                        </div>
                        <a href="${searchUrl}" class="home-venue-action">View venue <i class="fa-solid fa-arrow-right"></i></a>
                    </div>
                </article>`;
            }).join("");
        } catch (_) {
            activePlaygrounds.setAttribute("aria-busy", "false");
            activePlaygrounds.innerHTML = `<div class="home-venue-empty"><i class="fa-solid fa-circle-exclamation"></i><p>Active playgrounds could not be loaded. Please refresh and try again.</p></div>`;
            if (venueSummary) venueSummary.textContent = "Live playground information is temporarily unavailable.";
        }
    };

    fetchActivePlaygrounds();

})();
