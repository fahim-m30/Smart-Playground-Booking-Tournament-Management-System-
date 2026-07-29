/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : auth.route.js
 * Purpose : Authentication Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const router = express.Router();

const { login } = require("./auth.controller");
const { validateLogin } = require("./auth.validation");

router.post("/login", validateLogin, login);

module.exports = router;