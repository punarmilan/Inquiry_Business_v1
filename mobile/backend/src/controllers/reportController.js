const mongoose = require('mongoose');
const Report = require('../models/Report');
const Job = require('../models/Job');
const User = require('../models/User');
const Business = require('../models/Business');
const Offer = require('../models/Offer');
const ServiceBooking = require('../models/ServiceBooking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const assertTargetExists = async (targetType, targetId) => {
  const models = { job: Job, user: User, business: Business, offer: Offer, service_booking: ServiceBooking };
  const exists = await models[targetType].exists({ _id: targetId });
  if (!exists) {
    throw new ApiError(404, 'Report target not found', 'REPORT_TARGET_NOT_FOUND');
  }
};

const createReport = asyncHandler(async (req, res) => {
  const { targetType, reason, description } = req.body;
  const targetId = new mongoose.Types.ObjectId(req.body.targetId);

  if (targetType === 'user' && targetId.equals(req.user._id)) {
    throw new ApiError(422, 'You cannot report yourself', 'REPORT_SELF_NOT_ALLOWED');
  }

  await assertTargetExists(targetType, targetId);

  const existingPending = await Report.findOne({
    reporterId: req.user._id,
    targetType,
    targetId,
    status: 'pending',
  });
  if (existingPending) {
    throw new ApiError(
      409,
      'You already reported this — our team is reviewing it.',
      'REPORT_ALREADY_PENDING'
    );
  }

  const report = await Report.create({
    targetType,
    targetId,
    reporterId: req.user._id,
    reason,
    description: description || '',
  });

  res.status(201).json({ success: true, report });
});

module.exports = { createReport };
