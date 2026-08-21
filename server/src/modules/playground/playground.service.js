const slugify = require("slugify");
const Playground = require("./playground.model");

// ===================================================
// Create Playground
// ===================================================

const createPlayground = async (payload, adminId) => {
    const existingPlayground = await Playground.findOne({
        name: payload.name,
        isDeleted: false,
    });

    if (existingPlayground) {
        throw new Error("Playground already exists.");
    }

    const slug = slugify(payload.name, {
        lower: true,
        strict: true,
    });

    const playground = await Playground.create({
        ...payload,

        playgroundAdmin: adminId,

        slug,

        isApproved: false,

        status: "Inactive",
    });

    return playground;
};

// ===================================================
// Get All Active Playgrounds
// ===================================================

const getAllPlaygrounds = async (query) => {
    const filter = {
        isDeleted: false,
        isApproved: true,
        status: "Active",
    };

    // ===============================
    // Search
    // ===============================

    if (query.search) {
        filter.name = {
            $regex: query.search,
            $options: "i",
        };
    }

    // ===============================
    // Sport Type
    // ===============================

    if (query.sportType) {
        filter.sportType = query.sportType;
    }

    // ===============================
    // Division
    // ===============================

    if (query.division) {
        filter.division = query.division;
    }

    // ===============================
    // District
    // ===============================

    if (query.district) {
        filter.district = query.district;
    }

    // ===============================
    // Morning Price Range
    // ===============================

    if (query.minPrice || query.maxPrice) {
        filter["pricing.morning"] = {};

        if (query.minPrice) {
            filter["pricing.morning"].$gte = Number(query.minPrice);
        }

        if (query.maxPrice) {
            filter["pricing.morning"].$lte = Number(query.maxPrice);
        }
    }

    // ===============================
    // Pagination
    // ===============================

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // ===============================
    // Sorting
    // ===============================

    let sort = {
        createdAt: -1,
    };

    if (query.sort === "priceLow") {
        sort = {
            "pricing.morning": 1,
        };
    }

    if (query.sort === "priceHigh") {
        sort = {
            "pricing.morning": -1,
        };
    }

    if (query.sort === "rating") {
        sort = {
            averageRating: -1,
        };
    }

    // ===============================
    // Query
    // ===============================

    const data = await Playground.find(filter)
        .populate("playgroundAdmin", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Playground.countDocuments(filter);

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data,
    };
};
const getAllPlaygroundsForAdmin = async () => {
    return Playground.find({ isDeleted: false })
        .populate("playgroundAdmin", "name email phone")
        .sort({ createdAt: -1 });
};

// ===================================================
// Get Single Playground
// ===================================================

const getSinglePlayground = async (id) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    }).populate(
        "playgroundAdmin",
        "name email phone profileImage"
    );

    if (!playground) {
        throw new Error("Playground not found.");
    }

    return playground;
};
// ===================================================
// Update Playground
// ===================================================

const updatePlayground = async (id, payload, user) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    // Playground Admin or Super Admin
    if (
        playground.playgroundAdmin.toString() !==
            user.userId &&
        user.role !== "super-admin"
    ) {
        throw new Error(
            "You are not authorized to update this playground."
        );
    }

    // Update Slug
    if (payload.name) {
        payload.slug = slugify(payload.name, {
            lower: true,
            strict: true,
        });
    }

    const updatedPlayground =
        await Playground.findByIdAndUpdate(
            id,
            payload,
            {
                new: true,
                runValidators: true,
            }
        );

    return updatedPlayground;
};
// ===================================================
// Soft Delete Playground
// ===================================================

const deletePlayground = async (id, user) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    if (
        playground.playgroundAdmin.toString() !==
            user.userId &&
        user.role !== "super-admin"
    ) {
        throw new Error(
            "You are not authorized to delete this playground."
        );
    }

    const deletedPlayground =
        await Playground.findByIdAndUpdate(
            id,
            {
                isDeleted: true,
            },
            {
                new: true,
            }
        );

    return deletedPlayground;
};

// ===================================================
// Get My Playgrounds
// ===================================================

const getMyPlaygrounds = async (adminId) => {
    return await Playground.find({
        playgroundAdmin: adminId,
        isDeleted: false,
    })
        .populate(
            "playgroundAdmin",
            "name email"
        )
        .sort({
            createdAt: -1,
        });
};

// ===================================================
// Approve Playground
// ===================================================
const approvePlayground = async (id, superAdminId) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    if (playground.isApproved) {
        throw new Error("Playground is already approved.");
    }

    playground.isApproved = true;
    playground.status = "Active";
    playground.approvedBy = superAdminId;
    playground.approvedAt = new Date();

    await playground.save();

    return playground;
};
// ===================================================
// Deactivate Playground
// ===================================================

const deactivatePlayground = async (id) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    playground.status = "Inactive";

    await playground.save();

    return playground;
};
// ===================================================
// Activate Playground
// ===================================================

const activatePlayground = async (id) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    playground.status = "Active";

    await playground.save();

    return playground;
};
// ===================================================
// Export Services
// ===================================================

module.exports = {
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
};
