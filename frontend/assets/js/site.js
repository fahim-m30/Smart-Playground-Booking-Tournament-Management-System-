const SITE_NAV = [
    { label: "Home", href: "index.html" },
    { label: "Playgrounds", href: "playgrounds.html" },
    { label: "Tournament", href: "tournament.html" },
    { label: "About", href: "about.html" },
    { label: "Contact", href: "contact.html" }
];

const getAuthenticatedUser = () => {
    try {
        const user = JSON.parse(localStorage.getItem("authUser") || "null");
        return localStorage.getItem("authToken") && user?.role ? user : null;
    } catch (_) {
        return null;
    }
};

const PAGE_DATA = {
    about: {
        title: "About TURF",
        eyebrow: "Smart Playground Booking & Tournament Management System",
        intro: "TURF is built for modern sports communities that want fast booking, secure payments, and seamless tournament participation in one place.",
        highlights: [
            {
                icon: "fa-solid fa-futbol",
                title: "Book in Minutes",
                text: "Discover premium football, cricket, and badminton grounds with instant availability and simple reservation steps."
            },
            {
                icon: "fa-solid fa-trophy",
                title: "Join Tournaments",
                text: "Register your club, manage squads, and compete in polished tournament events with live updates."
            },
            {
                icon: "fa-solid fa-shield-halved",
                title: "Trusted Platform",
                text: "Every step is designed to feel secure, professional, and easy to use for players, owners, and organizers."
            }
        ],
        stats: [
            { value: "100+", label: "Active Playgrounds" },
            { value: "24/7", label: "Easy Booking" },
            { value: "4.9/5", label: "Community Rating" }
        ]
    },
    contact: {
        title: "Contact Us",
        eyebrow: "Need help or want to partner with TURF?",
        intro: "Reach out for booking support, playground owner onboarding, tournament collaboration, or any general inquiry.",
        contacts: [
            {
                icon: "fa-solid fa-envelope",
                title: "Email",
                value: "fmuntasir488@gmail.com",
                hint: "We reply within 1 business day"
            },
            {
                icon: "fa-solid fa-phone",
                title: "Phone",
                value: "01581876432",
                hint: "Available for urgent support"
            },
            {
                icon: "fa-solid fa-location-dot",
                title: "Office",
                value: "Banasree, Rampura, Dhaka, Bangladesh",
                hint: "Serving sports communities nationwide"
            }
        ],
        cta: "For playground owners, event organizers, or players, we are always ready to help."
    }
};

const buildHeader = (page) => {
    const currentPage = page || "home";
    const user = getAuthenticatedUser();
    const links = SITE_NAV.map((item) => {
        const isActive = currentPage === item.href.replace(".html", "");
        return `<li><a href="${item.href}" class="${isActive ? "active" : ""}">${item.label}</a></li>`;
    }).join("");

    return `
        <header id="navbar" class="navbar">
            <div class="container navbar-container">
                <a href="index.html" class="logo">
                    <img src="assets/images/favicon.png" alt="TURF Logo">
                    <div class="logo-text">
                        <h2>TURF</h2>
                        <span>Smart Playground Booking & Tournament Management System</span>
                    </div>
                </a>
                <nav class="nav-menu">
                    <ul>${links}</ul>
                </nav>
                <div class="nav-buttons">
                    ${user
        ? '<a href="dashboard.html" class="login-btn">Dashboard</a><a href="#" class="register-btn" data-logout>Log out</a>'
        : '<a href="login.html" class="login-btn">Login</a><a href="register.html" class="register-btn">Register</a>'}
                </div>
                <div class="menu-toggle"><i class="fa-solid fa-bars"></i></div>
            </div>
        </header>
    `;
};

const buildFooter = () => {
    const year = new Date().getFullYear();
    return `
        <footer id="footer">
            <div class="container footer-credit">
                <p><strong>TURF</strong> — Smart Playground Booking & Tournament Management System</p>
                <p>© ${year} TURF. All rights reserved.</p>
                <p><a href="about.html">About</a> · <a href="contact.html">Contact</a> · <a href="playgrounds.html">Playgrounds</a></p>
            </div>
        </footer>
    `;
};

const renderPageContent = (page) => {
    const content = document.getElementById("page-content");
    if (!content) return;

    const data = PAGE_DATA[page];
    if (!data) return;

    if (page === "about") {
        content.innerHTML = `
            <section class="page-hero">
                <div class="page-badge">${data.eyebrow}</div>
                <h1>${data.title}</h1>
                <p>${data.intro}</p>
            </section>
            <section class="stats-grid">
                ${data.stats.map((item) => `
                    <div class="stat-card">
                        <h3>${item.value}</h3>
                        <p>${item.label}</p>
                    </div>
                `).join("")}
            </section>
            <section class="page-grid">
                ${data.highlights.map((item) => `
                    <article class="page-card">
                        <div class="page-icon"><i class="${item.icon}"></i></div>
                        <h3>${item.title}</h3>
                        <p>${item.text}</p>
                    </article>
                `).join("")}
            </section>
        `;
        return;
    }

    if (page === "contact") {
        content.innerHTML = `
            <section class="page-hero">
                <div class="page-badge">${data.eyebrow}</div>
                <h1>${data.title}</h1>
                <p>${data.intro}</p>
            </section>
            <section class="page-grid">
                ${data.contacts.map((item) => `
                    <article class="page-card">
                        <div class="page-icon"><i class="${item.icon}"></i></div>
                        <h3>${item.title}</h3>
                        <p>${item.value}</p>
                        <span>${item.hint}</span>
                    </article>
                `).join("")}
            </section>
            <section class="contact-panel">
                <p>${data.cta}</p>
                <a href="mailto:fmuntasir488@gmail.com" class="btn-green">Email Support</a>
            </section>
        `;
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page || "home";
    const shell = document.getElementById("page-shell");
    if (shell) {
        shell.insertAdjacentHTML("beforebegin", buildHeader(page));
        document.body.insertAdjacentHTML("beforeend", buildFooter());
        renderPageContent(page);
        document.querySelector("[data-logout]")?.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.removeItem("authToken");
            localStorage.removeItem("authUser");
            location.reload();
        });
    }
});
