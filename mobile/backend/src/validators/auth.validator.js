const { Joi, phone } = require('./common');

const sendOtpSchema = Joi.object({
  body: Joi.object({
    phone,
    email: Joi.string().trim().lowercase().email(),
    intent: Joi.string().valid('login', 'register').default('login'),
  })
    .xor('phone', 'email')
    .required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const verifyOtpSchema = Joi.object({
  body: Joi.object({
    phone,
    email: Joi.string().trim().lowercase().email(),
    otp: Joi.string().trim().pattern(/^\d{4}$/).required(),
    intent: Joi.string().valid('login', 'register').default('login'),
  })
    .xor('phone', 'email')
    .required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const loginWithPasswordSchema = Joi.object({
  body: Joi.object({
    phone,
    email: Joi.string().trim().lowercase().email(),
    password: Joi.string().trim().min(6).max(200).required(),
  })
    .xor('phone', 'email')
    .required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const oauthLoginSchema = Joi.object({
  body: Joi.object({
    provider: Joi.string().valid('google', 'facebook').required(),
    token: Joi.string().trim().required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const oauthRegisterSchema = Joi.object({
  body: Joi.object({
    provider: Joi.string().valid('google', 'facebook').required(),
    token: Joi.string().trim().required(),
    phone: phone.required(),
    accountType: Joi.string().valid('worker', 'employer', 'both'),
    termsAccepted: Joi.boolean().valid(true).required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const refreshSchema = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().trim().required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = {
  loginWithPasswordSchema,
  oauthLoginSchema,
  oauthRegisterSchema,
  sendOtpSchema,
  verifyOtpSchema,
  refreshSchema,
};
