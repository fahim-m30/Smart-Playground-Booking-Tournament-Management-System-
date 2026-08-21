/**
 * ==========================================================
 * Project : TURF
 * File    : slider.js
 * Purpose : Hero Swiper Slider
 * Author  : Fahim Muntasir
 * ==========================================================
 */

const heroSwiper = new Swiper(".heroSwiper", {

    loop: true,

    speed: 1200,

    effect: "fade",

    autoplay: {

        delay: 5000,

        disableOnInteraction: false,

    },

    pagination: {

        el: ".swiper-pagination",

        clickable: true,

    },

});