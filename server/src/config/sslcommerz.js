/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : sslcommerz.js
 * Purpose : SSLCommerz Configuration
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const SSLCommerzPayment = require("sslcommerz-lts");

// ==========================================
// Store Information
// ==========================================

const store_id = process.env.STORE_ID;

const store_passwd =
    process.env.STORE_PASSWORD;

const is_live =
    process.env.SSL_IS_LIVE === "true";

// ==========================================
// SSLCommerz Instance
// ==========================================

const sslcommerz =
    new SSLCommerzPayment(

        store_id,

        store_passwd,

        is_live

    );

module.exports = sslcommerz;
