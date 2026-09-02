/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : playground.controller.js
 * Purpose : Playground Controller
 * Author  : Fahim Muntasir
 * ==============================================================
 */
const {
    createPlayground,
    getAllPlaygrounds,
    getAllPlaygroundsForAdmin,
    getSinglePlayground,
    updatePlayground,
    deletePlayground,
    getMyPlaygrounds,
    approvePlayground,
    activatePlayground,
    deactivatePlayground,
} = require("./playground.service");
const axios = require("axios");
const fileToDataUrl = (file) => file?.buffer ? `data:${file.mimetype || "image/jpeg"};base64,${file.buffer.toString("base64")}` : null;
const withImages = (req) => ({ ...req.body, ...(typeof req.body.pricing === "string" ? { pricing: JSON.parse(req.body.pricing) } : {}), ...(typeof req.body.facilities === "string" ? { facilities: req.body.facilities.split(",").map((item) => item.trim()).filter(Boolean) } : {}), ...(req.files?.coverImage?.[0] ? { coverImage: fileToDataUrl(req.files.coverImage[0]) } : {}), ...(req.files?.galleryImages ? { galleryImages: req.files.galleryImages.map(fileToDataUrl) } : {}) });
const isGoogleMapsUrl = (value) => {
    try {
        const host = new URL(value).hostname.toLowerCase();
        return host === "google.com" || host.endsWith(".google.com") || host === "goo.gl" || host.endsWith(".goo.gl");
    } catch (_) { return false; }
};
const coordinatesFromUrl = (value) => {
    const link = String(value || "");
    const match = link.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
        || link.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
        || link.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    return match ? { lat: match[1], lng: match[2] } : null;
};
// ===============================
// Create Playground
// ===============================

const createPlaygroundController = async (req, res) => {
    try {
        const playground = await createPlayground(
            withImages(req),
            req.user.userId
        );

        res.status(201).json({
            success: true,
            message: "Playground created successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Get All Playgrounds
// ===============================

const getAllPlaygroundsController = async (req, res) => {
    try {
        const result = await getAllPlaygrounds(req.query);

        res.status(200).json({
            success: true,
            message: "Playgrounds fetched successfully.",
            meta: result.meta,
            data: result.data,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getAllPlaygroundsForAdminController = async (req, res) => {
    try {
        const playgrounds = await getAllPlaygroundsForAdmin();
        res.status(200).json({ success: true, message: "All playgrounds fetched successfully.", data: playgrounds });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Resolve Google Maps share links (including maps.app.goo.gl short links) into venue address fields.
const resolveMapLocationController = async (req, res) => {
    try {
        const sharedUrl = String(req.query.url || "").trim();
        if (!isGoogleMapsUrl(sharedUrl)) throw new Error("Please provide a valid Google Maps link.");

        const mapResponse = await axios.get(sharedUrl, {
            timeout: 10000,
            maxRedirects: 5,
            responseType: "text",
            headers: { "User-Agent": "TURF Venue Setup/1.0" },
            beforeRedirect: (options) => {
                const host = String(options.hostname || "").toLowerCase();
                if (!(host === "google.com" || host.endsWith(".google.com") || host === "goo.gl" || host.endsWith(".goo.gl"))) throw new Error("The map link redirected to an unsupported location.");
            },
        });
        const resolvedUrl = mapResponse.request?.res?.responseUrl || sharedUrl;
        const coordinates = coordinatesFromUrl(resolvedUrl) || coordinatesFromUrl(mapResponse.data);
        if (!coordinates) throw new Error("We could not read this pin. Open the Google Maps link, copy its full browser URL, then paste it here.");

        const geocode = await axios.get("https://nominatim.openstreetmap.org/reverse", {
            timeout: 10000,
            params: { format: "jsonv2", zoom: 18, lat: coordinates.lat, lon: coordinates.lng },
            headers: { "User-Agent": "TURF Venue Setup/1.0 (venue location lookup)" },
        });
        const place = geocode.data;
        if (!place?.address) throw new Error("The selected pin could not be matched to an address.");
        const address = place.address;

        res.status(200).json({
            success: true,
            data: {
                googleMapLocation: resolvedUrl,
                address: place.display_name || "",
                area: address.suburb || address.neighbourhood || address.quarter || address.village || address.town || "",
                district: address.city_district || address.county || address.state_district || address.city || "",
                division: address.state || "",
            },
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || "Could not resolve the Google Maps location." });
    }
};

// ===============================
// Get Single Playground
// ===============================

const getSinglePlaygroundController = async (req, res) => {
    try {
        const playground = await getSinglePlayground(req.params.id);

        res.status(200).json({
            success: true,
            message: "Playground fetched successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Get My Playgrounds
// ===============================

const getMyPlaygroundsController = async (req, res) => {
    try {
        const playgrounds = await getMyPlaygrounds(req.user.userId);

        res.status(200).json({
            success: true,
            message: "My playgrounds fetched successfully.",
            data: playgrounds,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Update Playground
// ===============================

const updatePlaygroundController = async (req, res) => {
    try {
        const playground = await updatePlayground(
            req.params.id,
            withImages(req),
            req.user
        );

        res.status(200).json({
            success: true,
            message: "Playground updated successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Delete Playground
// ===============================

const deletePlaygroundController = async (req, res) => {
    try {
        await deletePlayground(
            req.params.id,
            req.user
        );

        res.status(200).json({
            success: true,
            message: "Playground deleted successfully.",
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Approve Playground
// ===============================

const approvePlaygroundController = async (req, res) => {
    try {
        const playground = await approvePlayground(
            req.params.id,
            req.user.userId
        );

        res.status(200).json({
            success: true,
            message: "Playground approved successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Activate Playground
// ===============================

const activatePlaygroundController = async (req, res) => {
    try {
        const playground = await activatePlayground(req.params.id);

        res.status(200).json({
            success: true,
            message: "Playground activated successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ===============================
// Deactivate Playground
// ===============================

const deactivatePlaygroundController = async (req, res) => {
    try {
        const playground = await deactivatePlayground(req.params.id);

        res.status(200).json({
            success: true,
            message: "Playground deactivated successfully.",
            data: playground,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Export Controllers
// ===============================

module.exports = {
    createPlayground: createPlaygroundController,
    getAllPlaygrounds: getAllPlaygroundsController,
    getAllPlaygroundsForAdmin: getAllPlaygroundsForAdminController,
    resolveMapLocation: resolveMapLocationController,
    getSinglePlayground: getSinglePlaygroundController,
    getMyPlaygrounds: getMyPlaygroundsController,
    updatePlayground: updatePlaygroundController,
    deletePlayground: deletePlaygroundController,
    approvePlayground: approvePlaygroundController,
    activatePlayground: activatePlaygroundController,
    deactivatePlayground: deactivatePlaygroundController,
};
