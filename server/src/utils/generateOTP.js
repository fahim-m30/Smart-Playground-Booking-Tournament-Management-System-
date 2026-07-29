/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : generateOTP.js
 * Purpose : Generate 6 Digit OTP
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const otpGenerator = require("otp-generator");

const generateOTP = () => {
    return otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
        digits: true,
    });
};

module.exports = generateOTP;