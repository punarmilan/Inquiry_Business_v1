const Report = require('../models/Report');
const Job = require('../models/Job');
const User = require('../models/User');
const Business = require('../models/Business');
const Offer = require('../models/Offer');
const ServiceBooking = require('../models/ServiceBooking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const reportTargets = {
  job: { model: Job, select: 'title category status' },
  user: { model: User, select: 'name phone isActive' },
  business: { model: Business, select: 'name verificationStatus isActive' },
  offer: { model: Offer, select: 'title status isActive' },
  service_booking: { model: ServiceBooking, select: 'bookingNumber status scheduledFor locality' },
};

const attachTargets = async (reports) => {
  const targetsByType = {};
  for (const [targetType, config] of Object.entries(reportTargets)) {
    const ids = reports.filter((report) => report.targetType === targetType).map((report) => report.targetId);
    if (!ids.length) continue;
    const targets = await config.model.find({ _id: { $in: ids } }).select(config.select).lean();
    targetsByType[targetType] = new Map(targets.map((target) => [String(target._id), target]));
  }
  return reports.map((report) => ({
    ...report,
    target: targetsByType[report.targetType]?.get(String(report.targetId)) || null,
  }));
};

const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.targetType) filter.targetType = req.query.targetType;

  const [reportRows, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reporterId', 'name phone').lean(),
    Report.countDocuments(filter),
  ]);
  const reports = await attachTargets(reportRows);

  res.json({ success: true, ...paginatedResponse({ data: reports, total, page, limit }) });
});

const setReportStatus = (status) =>
  asyncHandler(async (req, res) => {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { $set: { status, reviewedBy: req.admin._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!report) throw new ApiError(404, 'Report not found', 'REPORT_NOT_FOUND');
    res.json({ success: true, report });
  });

module.exports = {
  listReports,
  approveReport: setReportStatus('approved'),
  rejectReport: setReportStatus('rejected'),
};
