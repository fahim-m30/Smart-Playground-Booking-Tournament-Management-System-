/**
 * ==========================================================
 * Project : TURF
 * File    : navbar.js
 * Purpose : Navbar Animation & Mobile Menu
 * Author  : Fahim Muntasir
 * ==========================================================
 */

const navbar = document.getElementById("navbar");
const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");
const navButtons = document.querySelector(".nav-buttons");

/* ==========================================
   Navbar Scroll Effect
========================================== */

window.addEventListener("scroll", () => {

    if (window.scrollY > 50) {

        navbar.style.background = "rgba(255,255,255,0.96)";
        navbar.style.boxShadow = "0 15px 35px rgba(0,0,0,.08)";
        navbar.style.padding = "0";

    } else {

        navbar.style.background = "rgba(255,255,255,.92)";
        navbar.style.boxShadow = "0 8px 30px rgba(15,23,42,.05)";

    }

});


/* ==========================================
   Mobile Menu
========================================== */

menuToggle.addEventListener("click", () => {

    navMenu.classList.toggle("show-menu");
    navButtons.classList.toggle("show-buttons");

});