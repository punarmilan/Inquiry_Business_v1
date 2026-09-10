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
const env = require('../config/env');

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
    Promise.all([
      Payment.aggregate([{ $match: { status: 'verified', type: { $in: ['subscription', 'service'] } } }, { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$type', 'subscription'] }, '$amount', { $multiply: ['$amount', env.platformCommissionRate] }] } } } }]),
      Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$platformCommission' } } }]),
    ]),
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
      totalRevenue: (revenueAgg[0][0]?.total ?? 0) + (revenueAgg[1][0]?.total ?? 0),
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
  const inclusiveDateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
  if (inclusiveDateTo) inclusiveDateTo.setUTCHours(23, 59, 59, 999);

  const match = { status: 'completed', date: { $type: 'date' } };
  if (req.query.dateFrom || req.query.dateTo) {
    if (req.query.dateFrom) match.date.$gte = new Date(req.query.dateFrom);
    if (inclusiveDateTo) match.date.$lte = inclusiveDateTo;
  }

  const transactionSeries = await Transaction.aggregate([
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

  const paymentDateMatch = { $type: 'date' };
  if (req.query.dateFrom) paymentDateMatch.$gte = new Date(req.query.dateFrom);
  if (inclusiveDateTo) paymentDateMatch.$lte = inclusiveDateTo;
  const paymentSeries = await Payment.aggregate([
    { $match: { status: 'verified', type: { $in: ['subscription', 'service'] } } },
    { $addFields: { metricDate: { $ifNull: ['$verifiedAt', '$createdAt'] } } },
    { $match: { metricDate: paymentDateMatch } },
    { $group: { _id: { $dateToString: { format, date: '$metricDate' } }, commission: { $sum: { $cond: [{ $eq: ['$type', 'subscription'] }, '$amount', { $multiply: ['$amount', env.platformCommissionRate] }] } }, volume: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const byPeriod = new Map();
  [...transactionSeries, ...paymentSeries].forEach((row) => {
    const current = byPeriod.get(row._id) || { period: row._id, commission: 0, volume: 0, count: 0 };
    current.commission += row.commission || 0;
    current.volume += row.volume || 0;
    current.count += row.count || 0;
    byPeriod.set(row._id, current);
  });
  const series = [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));

  res.json({
    success: true,
    series,
  });
});

module.exports = { getStats, getRevenueSeries };
