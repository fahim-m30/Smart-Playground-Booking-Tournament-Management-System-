/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : keepAliveJob.js
 * Purpose : Prevent Render Web Service from sleeping / idling
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const https = require("https");
const http = require("http");

const DEFAULT_URL = "https://smart-playground-booking-tournament.onrender.com";
const TARGET_URL = (process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || DEFAULT_URL).replace(/\/$/, "");
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render idle limit is 15 minutes)

let timer = null;

const pingServer = () => {
    try {
        const pingUrl = `${TARGET_URL}/health`;
        const client = pingUrl.startsWith("https") ? https : http;

        const req = client.get(pingUrl, { timeout: 15000 }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                console.log(`[KeepAlive] 🟢 Health ping successful to ${pingUrl} (Status: ${res.statusCode}, Uptime: ${Math.floor(process.uptime())}s)`);
            } else {
                console.warn(`[KeepAlive] 🟡 Health ping returned status: ${res.statusCode}`);
            }
            res.resume(); // Free memory
        });

        req.on("error", (err) => {
            console.warn(`[KeepAlive] ⚠️ Health ping failed: ${err.message}`);
        });

        req.on("timeout", () => {
            req.destroy();
            console.warn("[KeepAlive] ⚠️ Health ping timed out.");
        });
    } catch (err) {
        console.warn(`[KeepAlive] ⚠️ Unexpected ping error: ${err.message}`);
    }
};

const startKeepAliveJob = () => {
    if (process.env.DISABLE_KEEPALIVE === "true") {
        console.log("[KeepAlive] Worker disabled via DISABLE_KEEPALIVE env.");
        return;
    }

    console.log(`[KeepAlive] 🚀 Keep-alive worker started. Pinging ${TARGET_URL}/health every 10 minutes.`);

    // Quick initial ping after 30 seconds
    setTimeout(pingServer, 30 * 1000);

    // Periodic ping every 10 minutes
    if (!timer) {
        timer = setInterval(pingServer, PING_INTERVAL_MS);
        if (timer.unref) timer.unref();
    }
};

const stopKeepAliveJob = () => {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
};

module.exports = {
    startKeepAliveJob,
    stopKeepAliveJob,
    pingServer,
};
