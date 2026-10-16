const { Joi } = require('./common');

const revenueSeriesSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    granularity: Joi.string().valid('daily', 'weekly', 'monthly').default('daily'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
  }),
  params: Joi.object({}),
});

const statsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({ compareDays: Joi.number().valid(7, 30, 90).default(7) }),
  params: Joi.object({}),
});

const performanceSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({ range: Joi.number().valid(7, 30, 90).default(7) }),
  params: Joi.object({}),
});

const searchSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({ q: Joi.string().trim().min(2).max(80).required() }),
  params: Joi.object({}),
});

module.exports = { revenueSeriesSchema, statsSchema, performanceSchema, searchSchema };
