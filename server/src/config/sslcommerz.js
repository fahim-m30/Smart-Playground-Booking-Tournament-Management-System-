/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : sslcommerz.js
 * Purpose : SSLCommerz Configuration
 * ==============================================================
 */

const SSLCommerzPayment = require("sslcommerz-lts");

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = process.env.SSL_IS_LIVE === "true";

const sslcommerz = new SSLCommerzPayment(
    store_id,
    store_passwd,
    is_live
);

module.exports = sslcommerz;