/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : user.route.js
 * Purpose : User Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const router = express.Router();

const { register } = require("./user.controller");
const { validateRegister } = require("./user.validation");

// ===============================
// User Routes
// ===============================

router.post("/register", validateRegister, register);

module.exports = router;