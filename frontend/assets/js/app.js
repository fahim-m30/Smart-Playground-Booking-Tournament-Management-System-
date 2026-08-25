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
})();
