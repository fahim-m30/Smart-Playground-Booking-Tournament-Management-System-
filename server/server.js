// ===============================================================
// Project Name : Smart Playground Booking & Tournament Management System
// File Name    : server.js
// Description  : Entry point of the backend application.
// Author       : Fahim Muntasir
// ===============================================================

// ===============================
// Import Required Package
// ===============================
const express = require("express");

// ===============================
// Create Express Application
// ===============================
const app = express();

// ===============================
// Define Application Port
// ===============================
// If a PORT is defined in the .env file,
// the application will use it.
// Otherwise, it will run on port 5000.
const PORT = process.env.PORT || 5000;

// ===============================
// Default Route
// ===============================
// This route is used to verify
// that the backend server is
// running successfully.
app.get("/", (req, res) => {
  res
    .status(200)
    .send(
      "Welcome to Smart Playground Booking & Tournament Management System API."
    );
});

// ===============================
// Start Express Server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server is running successfully on Port ${PORT}`);
});