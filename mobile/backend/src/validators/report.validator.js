const { Joi, objectId } = require('./common');

const REPORT_REASONS = [
  'Spam / Fake job',
  'Spam / Fake offer',
  'Fraud / Scam',
  'Abusive behavior',
  'Unsafe behavior',
  'Incorrect information',
  'Payment issue',
  'Harassment',
  'Other',
];

const createReportSchema = Joi.object({
  body: Joi.object({
    targetType: Joi.string().valid('job', 'user', 'business', 'offer', 'service_booking').required(),
    targetId: objectId.required(),
    reason: Joi.string()
      .valid(...REPORT_REASONS)
      .required(),
    description: Joi.when('reason', {
      is: 'Other',
      then: Joi.string().trim().min(1).max(1000).required().messages({
        'string.empty': 'Please describe the issue.',
      }),
      otherwise: Joi.string().trim().max(1000).allow('').optional(),
    }),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = { createReportSchema, REPORT_REASONS };
