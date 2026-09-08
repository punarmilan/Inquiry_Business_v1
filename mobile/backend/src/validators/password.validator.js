const { Joi } = require('./common');

const PASSWORD_POLICY_MESSAGE =
  'Password must be 8-200 characters and include uppercase, lowercase, number, and special character.';

const isStrongPassword = (value) => {
  if (typeof value !== 'string' || value.length < 8 || value.length > 200) return false;
  if (value !== value.trim()) return false;
  return /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9\s]/.test(value);
};

const passwordPolicy = Joi.string()
  .min(8)
  .max(200)
  .custom((value, helpers) => {
    if (value !== value.trim()) return helpers.error('password.edgeWhitespace');
    if (!/[A-Z]/.test(value)) return helpers.error('password.uppercase');
    if (!/[a-z]/.test(value)) return helpers.error('password.lowercase');
    if (!/\d/.test(value)) return helpers.error('password.number');
    if (!/[^A-Za-z0-9\s]/.test(value)) return helpers.error('password.special');
    return value;
  }, 'password policy')
  .messages({
    'string.min': 'Password must be at least 8 characters long.',
    'string.max': 'Password must be at most 200 characters long.',
    'password.edgeWhitespace': 'Password must not start or end with whitespace.',
    'password.uppercase': PASSWORD_POLICY_MESSAGE,
    'password.lowercase': PASSWORD_POLICY_MESSAGE,
    'password.number': PASSWORD_POLICY_MESSAGE,
    'password.special': PASSWORD_POLICY_MESSAGE,
  });

module.exports = { PASSWORD_POLICY_MESSAGE, isStrongPassword, passwordPolicy };
