const { Joi, objectId } = require('./common');

const updateHomeShowcase = Joi.object({
  body: Joi.object({
    banner: Joi.object({
      imageUrl: Joi.string().trim().max(2048).pattern(/^https:\/\//).allow('').required(),
      title: Joi.string().trim().max(100).allow('').required(),
      subtitle: Joi.string().trim().max(180).allow('').required(),
      buttonText: Joi.string().trim().max(40).allow('').required(),
    }).required(),
    trendingOfferIds: Joi.array().items(objectId).unique().max(12).required(),
  }).required(),
});

module.exports = { updateHomeShowcase };
