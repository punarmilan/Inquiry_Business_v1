const Joi = require('joi');
const validHomeLink = (value) => {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\u0000-\u001f\u007f\\]/.test(value) || !/^https?:\/\//i.test(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
};
const homeHeader = Joi.object({
  style: Joi.string().valid('photoCarousel', 'heroShortcuts', 'splitCarousel', 'accordion').required(),
  autoPlay: Joi.boolean().required(), intervalSeconds: Joi.number().integer().min(3).max(10).required(),
  transition: Joi.when('style', { is: 'accordion', then: Joi.string().valid('expand').required(), otherwise: Joi.string().valid('slide', 'fade').required() }),
  showArrows: Joi.boolean().required(), showDots: Joi.boolean().required(), height: Joi.string().valid('small', 'medium', 'large').required(),
}).unknown(false);
module.exports = { validHomeLink, homeHeader };
