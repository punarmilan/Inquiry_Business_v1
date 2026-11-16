const Setting = require('../models/Setting');
const asyncHandler = require('../utils/asyncHandler');

const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Setting.find({ key: { $not: /^ui\./ } }).select('key value').lean();
  const map = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  res.json({ success: true, settings: map });
});

module.exports = { getSettings };
