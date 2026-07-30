const Joi = require("joi");

const createPlaygroundValidation = Joi.object({
  name: Joi.string().trim().required(),

  description: Joi.string().trim().required(),

  sportType: Joi.string()
    .valid("Football", "Cricket", "Badminton")
    .required(),

  images: Joi.array().items(Joi.string()),

  pricePerHour: Joi.number().min(0).required(),

  phone: Joi.string().trim().required(),

  email: Joi.string().email().required(),

  address: Joi.string().trim().required(),

  division: Joi.string().trim().required(),

  district: Joi.string().trim().required(),

  area: Joi.string().trim().required(),

  openingTime: Joi.string().required(),

  closingTime: Joi.string().required(),

  maxPlayers: Joi.number().min(1).required(),

  facilities: Joi.array().items(Joi.string()),
});

const updatePlaygroundValidation = Joi.object({
  name: Joi.string().trim(),

  description: Joi.string().trim(),

  sportType: Joi.string().valid(
    "Football",
    "Cricket",
    "Badminton"
  ),

  images: Joi.array().items(Joi.string()),

  pricePerHour: Joi.number().min(0),

  phone: Joi.string().trim(),

  email: Joi.string().email(),

  address: Joi.string().trim(),

  division: Joi.string().trim(),

  district: Joi.string().trim(),

  area: Joi.string().trim(),

  openingTime: Joi.string(),

  closingTime: Joi.string(),

  maxPlayers: Joi.number().min(1),

  facilities: Joi.array().items(Joi.string()),
});

module.exports = {
  createPlaygroundValidation,
  updatePlaygroundValidation,
};