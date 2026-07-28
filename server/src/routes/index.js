/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : index.js
 * Purpose : Application Routes
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const express = require("express");

const router = express.Router();

const userRoutes = require("../modules/user/user.route");

router.use("/users", userRoutes);

module.exports = router;
