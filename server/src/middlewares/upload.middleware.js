/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : upload.middleware.js
 * Purpose : Upload Profile Image Using Multer
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const multer = require("multer");

// ===============================
// Memory Storage
// ===============================

const storage = multer.memoryStorage();

// ===============================
// Multer Upload
// ===============================

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

module.exports = upload;