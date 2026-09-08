const { Joi, objectId, indianPhone } = require('./common');

const providerApplicationBody = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  phone: indianPhone.required(),
  email: Joi.string().trim().lowercase().email().required(),
  cityId: objectId.required(),
  categoryIds: Joi.array().items(objectId.required()).min(1).max(20).required(),
  experienceYears: Joi.number().min(0).max(60),
  serviceAreas: Joi.array().items(Joi.string().trim().min(1).max(120)).min(1).max(100).required(),
  message: Joi.string().trim().min(1).max(1000).required(),
  termsAccepted: Joi.boolean().valid(true).required(),
  oauthProvider: Joi.string().valid('google'),
  oauthToken: Joi.string().trim().when('oauthProvider', {
    is: 'google',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
}).required();

const providerApplicationSchema = Joi.object({
  body: providerApplicationBody,
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = { providerApplicationSchema };
