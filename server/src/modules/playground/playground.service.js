const slugify = require("slugify");
const Playground = require("./playground.model");

// ===================================================
// Create Playground
// ===================================================

const createPlayground = async (payload, ownerId) => {
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
        owner: ownerId,
        slug,
        status: "Pending", // New playground requires approval
    });

    return playground;
};

// ===================================================
// Get All Approved Playgrounds
// ===================================================

const getAllPlaygrounds = async (query) => {
    const filter = {
        isDeleted: false,
        status: "Approved",
    };

    // Search
    if (query.search) {
        filter.name = {
            $regex: query.search,
            $options: "i",
        };
    }

    // Sport Type
    if (query.sportType) {
        filter.sportType = query.sportType;
    }

    // Division
    if (query.division) {
        filter.division = query.division;
    }

    // District
    if (query.district) {
        filter.district = query.district;
    }

    // Price Range
    if (query.minPrice || query.maxPrice) {
        filter.pricePerHour = {};

        if (query.minPrice) {
            filter.pricePerHour.$gte = Number(query.minPrice);
        }

        if (query.maxPrice) {
            filter.pricePerHour.$lte = Number(query.maxPrice);
        }
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    let sort = {
        createdAt: -1,
    };

    if (query.sort === "priceLow") {
        sort = {
            pricePerHour: 1,
        };
    }

    if (query.sort === "priceHigh") {
        sort = {
            pricePerHour: -1,
        };
    }

    if (query.sort === "rating") {
        sort = {
            averageRating: -1,
        };
    }

    const data = await Playground.find(filter)
        .populate("owner", "name email")
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

// ===================================================
// Get Single Playground
// ===================================================

const getSinglePlayground = async (id) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    }).populate("owner", "name email");

    if (!playground) {
        throw new Error("Playground not found.");
    }

    return playground;
};// ===================================================
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

    // Owner or Super Admin Authorization
    if (
        playground.owner.toString() !== user.userId &&
        user.role !== "super-admin"
    ) {
        throw new Error(
            "You are not authorized to update this playground."
        );
    }

    // Update Slug if Name Changes
    if (payload.name) {
        payload.slug = slugify(payload.name, {
            lower: true,
            strict: true,
        });
    }

    const updatedPlayground = await Playground.findByIdAndUpdate(
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

    // Owner or Super Admin Authorization
    if (
        playground.owner.toString() !== user.userId &&
        user.role !== "super-admin"
    ) {
        throw new Error(
            "You are not authorized to delete this playground."
        );
    }

    const deletedPlayground = await Playground.findByIdAndUpdate(
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

const getMyPlaygrounds = async (ownerId) => {
    return await Playground.find({
        owner: ownerId,
        isDeleted: false,
    })
        .sort({
            createdAt: -1,
        })
        .populate("owner", "name email");
};
// ===============================
// Get Pending Playgrounds
// ===============================

const getPendingPlaygrounds = async () => {
    const playgrounds = await Playground.find({
        status: "Pending",
        isDeleted: false,
    })
        .populate("owner", "name email phone")
        .sort({ createdAt: -1 });

    return playgrounds;
};

// ===================================================
// Export Services
// ===================================================
// ===============================
// Approve Playground
// ===============================

const approvePlayground = async (id) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    if (playground.status === "Approved") {
        throw new Error("Playground is already approved.");
    }

    playground.status = "Approved";
    playground.rejectionReason = null;

    await playground.save();

    return playground;
};

// ===============================
// Reject Playground
// ===============================

const rejectPlayground = async (id, rejectionReason) => {
    const playground = await Playground.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!playground) {
        throw new Error("Playground not found.");
    }

    playground.status = "Rejected";
    playground.rejectionReason = rejectionReason;

    await playground.save();

    return playground;
};

module.exports = {
    createPlayground,
    getAllPlaygrounds,
    getSinglePlayground,
    updatePlayground,
    deletePlayground,
    getMyPlaygrounds,
    getPendingPlaygrounds,
    approvePlayground,
    rejectPlayground,
};