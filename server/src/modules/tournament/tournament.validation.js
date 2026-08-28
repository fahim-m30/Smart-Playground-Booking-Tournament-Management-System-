/**
 * ==============================================================
 * Project : Smart Playground Booking & Tournament Management System
 * File    : tournament.validation.js
 * Purpose : Tournament Validation
 * Author  : Fahim Muntasir
 * ==============================================================
 */

const Joi = require("joi");

const createTournamentValidation = Joi.object({
    name: Joi.string().trim().min(3).max(120).required(),

    description: Joi.string().trim().min(10).max(2000).required(),

    sportType: Joi.string().valid("Football", "Cricket", "Badminton").required(),

    playground: Joi.string().length(24).hex().required(),

    totalTeams: Joi.number().min(4).max(24).required(),

    groupCount: Joi.number().integer().min(2).max(8).default(2),

    teamsPerGroup: Joi.number().min(2).max(8).default(4),

    playingMembers: Joi.number().min(1).required(),

    extraMembers: Joi.number().min(0).required(),

    registrationFee: Joi.number().min(0).required(),

    startDate: Joi.date().required(),

    endDate: Joi.date().min(Joi.ref("startDate")).required(),
});

const addTeamValidation = Joi.object({
    teamName: Joi.string().required(),

    captain: Joi.string().allow(null, ""),

    contactNumber: Joi.string().required(),

    // Customers are assigned automatically to the least-filled group.  The
    // optional value is retained only for an administrator adding a team.
    group: Joi.string().optional(),

    players: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().required(),
                isPlaying: Joi.boolean().required(),
            })
        )
        .required(),
});

const updateMatchValidation = Joi.object({
    teamAScore: Joi.number().min(0).allow(null),

    teamBScore: Joi.number().min(0).allow(null),

    winner: Joi.string().allow(null),

    matchStatus: Joi.string().valid("Scheduled", "Live", "Completed", "Cancelled"),
});

const scheduleMatchValidation = Joi.object({
    teamA: Joi.string().length(24).hex(),

    teamB: Joi.string().length(24).hex(),

    playground: Joi.string().length(24).hex(),

    matchDate: Joi.date(),

    startTime: Joi.string().trim(),

    endTime: Joi.string().trim(),

    stage: Joi.string().valid("Group", "Quarter Final", "Semi Final", "Final", "Third Place"),

    matchStatus: Joi.string().valid("Scheduled", "Live", "Completed", "Cancelled"),
});

const updateTournamentTeamCountsValidation = Joi.object({
    totalTeams: Joi.number().min(4).max(24),

    groupCount: Joi.number().min(2).max(8),

    teamsPerGroup: Joi.number().min(2).max(8),
});

module.exports = {
    createTournamentValidation,
    addTeamValidation,
    updateMatchValidation,
    scheduleMatchValidation,
    updateTournamentTeamCountsValidation,
};
