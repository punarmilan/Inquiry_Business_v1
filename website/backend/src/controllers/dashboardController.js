const User = require('../models/User');
const Job = require('../models/Job');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const Payout = require('../models/Payout');
const City = require('../models/City');
const Business = require('../models/Business');
const Offer = require('../models/Offer');
const Subscription = require('../models/Subscription');
const ServiceBooking = require('../models/ServiceBooking');
const Worker = require('../models/Worker');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const getStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const [
    totalUsers, activeCities, businesses, activeOffers, pendingOffers,
    activeSubscriptions, serviceBookings, activeWorkers, revenueAgg,
  ] = await Promise.all([
    User.countDocuments(),
    City.countDocuments({ isActive: true }),
    Business.countDocuments({ isActive: true }),
    Offer.countDocuments({ status: 'approved', isActive: true, startsAt: { $lte: now }, expiresAt: { $gte: now } }),
    Offer.countDocuments({ status: 'pending_review' }),
    Subscription.countDocuments({ status: 'active', startsAt: { $lte: now }, endsAt: { $gte: now } }),
    ServiceBooking.countDocuments(),
    Worker.countDocuments({ isActive: true }),
    Payment.aggregate([{ $match: { status: 'verified' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      activeCities,
      businesses,
      activeOffers,
      pendingOffers,
      activeSubscriptions,
      serviceBookings,
      activeWorkers,
      totalRevenue: revenueAgg[0]?.total ?? 0,
    },
  });
});

const GRANULARITY_FORMATS = {
  daily: '%Y-%m-%d',
  weekly: '%G-W%V',
  monthly: '%Y-%m',
};

const getRevenueSeries = asyncHandler(async (req, res) => {
  const granularity = ['daily', 'weekly', 'monthly'].includes(req.query.granularity)
    ? req.query.granularity
    : 'daily';
  const format = GRANULARITY_FORMATS[granularity];

  const match = { status: 'completed' };
  if (req.query.dateFrom || req.query.dateTo) {
    match.date = {};
    if (req.query.dateFrom) match.date.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) match.date.$lte = new Date(req.query.dateTo);
  }

  const series = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format, date: '$date' } },
        commission: { $sum: '$platformCommission' },
        volume: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    series: series.map((row) => ({
      period: row._id,
      commission: row.commission,
      volume: row.volume,
      count: row.count,
    })),
  });
});

module.exports = { getStats, getRevenueSeries };
