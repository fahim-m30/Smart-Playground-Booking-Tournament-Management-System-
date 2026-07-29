const express = require("express");

const router = express.Router();

const userRoutes = require("../modules/user/user.route");
const authRoutes = require("../modules/auth/auth.route");

router.use("/users", userRoutes);
router.use("/auth", authRoutes);

module.exports = router;