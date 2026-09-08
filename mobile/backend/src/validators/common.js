const Joi = require('joi');
const { normalizeIndianPhone } = require('../utils/phoneValidation');

const objectId = Joi.string().hex().length(24);

const phone = Joi.string()
  .trim()
  .pattern(/^\+?[1-9][\d\s-]{7,18}$/)
  .messages({
    'string.pattern.base': 'Phone number must be valid, e.g. +919876543210.',
  });

const indianPhone = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const normalized = normalizeIndianPhone(value);
    return normalized || helpers.error('string.indianPhone');
  })
  .messages({
    'string.indianPhone': 'Phone number must contain exactly 10 local digits, e.g. +919876543210.',
  });

const location = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().trim().min(2).max(300).required(),
});

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

module.exports = { Joi, objectId, phone, indianPhone, location, pagination };
