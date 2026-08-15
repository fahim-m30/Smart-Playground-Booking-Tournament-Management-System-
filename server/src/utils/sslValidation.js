/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : sslValidation.js
 * Purpose : SSLCommerz Payment Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const axios = require("axios");

// ==============================================
// Validate SSL Payment
// ==============================================

const validateSSLPayment = async (
    validationId
) => {

    try {

        const baseURL =
            process.env.SSL_IS_LIVE === "true"
                ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
                : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";

        const url =
            `${baseURL}?` +
            `val_id=${validationId}` +
            `&store_id=${process.env.STORE_ID}` +
            `&store_passwd=${process.env.STORE_PASSWORD}` +
            `&format=json`;

        const response =
            await axios.get(url);

        console.log("=================================");
        console.log("SSL VALIDATION RESPONSE");
        console.log(response.data);
        console.log("=================================");

        return response.data;

    } catch (error) {

        console.log("=================================");
        console.log("SSL VALIDATION ERROR");
        console.log(
            error.response?.data ||
            error.message
        );
        console.log("=================================");

        throw error;
    }

};

module.exports = validateSSLPayment;