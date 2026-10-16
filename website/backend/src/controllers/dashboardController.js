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
const ProviderApplication = require('../models/ProviderApplication');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const DAY_MS = 24 * 60 * 60 * 1000;
// Dashboard days are Indian calendar days, not UTC ones. IST has no DST, so a
// fixed +05:30 offset is exact.
const TZ = 'Asia/Kolkata';
const TZ_OFFSET = '+05:30';

// Platform revenue, same definition as getStats: a subscription is all ours, a
// service payment earns the commission share, completed jobs their commission.
const PAYMENT_REVENUE = { $cond: [{ $eq: ['$type', 'subscription'] }, '$amount', { $multiply: ['$amount', env.platformCommissionRate] }] };
const REVENUE_PAYMENTS = { status: 'verified', type: { $in: ['subscription', 'service'] } };

const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const dayBucket = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: TZ } });

// The last `days` IST days ending today (oldest first) and the instant the first one begins.
const dayWindow = (days) => {
  const keys = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) keys.push(dayKey(new Date(Date.now() - offset * DAY_MS)));
  return { keys, start: new Date(`${keys[0]}T00:00:00${TZ_OFFSET}`) };
};

const revenueUntil = async (until) => {
  const [payments, transactions] = await Promise.all([
    Payment.aggregate([
      { $match: REVENUE_PAYMENTS },
      { $addFields: { metricDate: { $ifNull: ['$verifiedAt', '$createdAt'] } } },
      { $match: { metricDate: { $lt: until } } },
      { $group: { _id: null, total: { $sum: PAYMENT_REVENUE } } },
    ]),
    Transaction.aggregate([{ $match: { status: 'completed', date: { $lt: until } } }, { $group: { _id: null, total: { $sum: '$platformCommission' } } }]),
  ]);
  return (payments[0]?.total ?? 0) + (transactions[0]?.total ?? 0);
};

const revenueByDay = async (start) => {
  const [payments, transactions] = await Promise.all([
    Payment.aggregate([
      { $match: REVENUE_PAYMENTS },
      { $addFields: { metricDate: { $ifNull: ['$verifiedAt', '$createdAt'] } } },
      { $match: { metricDate: { $gte: start } } },
      { $group: { _id: dayBucket('$metricDate'), total: { $sum: PAYMENT_REVENUE } } },
    ]),
    Transaction.aggregate([
      { $match: { status: 'completed', date: { $gte: start } } },
      { $group: { _id: dayBucket('$date'), total: { $sum: '$platformCommission' } } },
    ]),
  ]);
  const byDay = new Map();
  [...payments, ...transactions].forEach((row) => byDay.set(row._id, (byDay.get(row._id) || 0) + row.total));
  return byDay;
};

const createdByDay = async (Model, match, start) => {
  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: start } } },
    { $group: { _id: dayBucket('$createdAt'), count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
};

const COMPARE_WINDOWS = [7, 30, 90];

const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const compareDays = COMPARE_WINDOWS.includes(Number(req.query.compareDays)) ? Number(req.query.compareDays) : 7;
  const since = new Date(now.getTime() - compareDays * DAY_MS);
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

  // The same figures as they stood `compareDays` ago, rebuilt from timestamps.
  // Offers carry moderatedAt, so "pending then" is exact; the others use
  // createdAt / validity windows, which is exact except for records that were
  // later deactivated (those count as if they had always been inactive).
  const [
    prevUsers, prevCities, prevBusinesses, prevActiveOffers, prevPendingOffers,
    prevSubscriptions, prevBookings, prevWorkers, prevRevenue,
    pendingProviderApplications, pendingReports, pendingBusinessVerifications,
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $lt: since } }),
    City.countDocuments({ isActive: true, createdAt: { $lt: since } }),
    Business.countDocuments({ isActive: true, createdAt: { $lt: since } }),
    Offer.countDocuments({ status: 'approved', isActive: true, moderatedAt: { $lte: since }, startsAt: { $lte: since }, expiresAt: { $gte: since } }),
    Offer.countDocuments({ createdAt: { $lt: since }, $or: [{ status: 'pending_review' }, { moderatedAt: { $gt: since } }] }),
    Subscription.countDocuments({ startsAt: { $lte: since }, endsAt: { $gte: since }, $or: [{ status: { $in: ['active', 'expired'] } }, { status: 'cancelled', updatedAt: { $gt: since } }] }),
    ServiceBooking.countDocuments({ createdAt: { $lt: since } }),
    Worker.countDocuments({ isActive: true, createdAt: { $lt: since } }),
    revenueUntil(since),
    ProviderApplication.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'pending' }),
    Business.countDocuments({ isActive: true, verificationStatus: 'pending' }),
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
    compareDays,
    previous: {
      totalUsers: prevUsers,
      activeCities: prevCities,
      businesses: prevBusinesses,
      activeOffers: prevActiveOffers,
      pendingOffers: prevPendingOffers,
      activeSubscriptions: prevSubscriptions,
      serviceBookings: prevBookings,
      activeWorkers: prevWorkers,
      totalRevenue: prevRevenue,
    },
    attention: { pendingOffers, pendingProviderApplications, pendingReports, pendingBusinessVerifications },
  });
});

const PERFORMANCE_RANGES = [7, 30, 90];

// Running totals per IST day, so the last point equals today's headline figure.
const getPerformance = asyncHandler(async (req, res) => {
  const range = PERFORMANCE_RANGES.includes(Number(req.query.range)) ? Number(req.query.range) : 7;
  const { keys, start } = dayWindow(range);
  const [usersBefore, businessesBefore, revenueBefore, newUsers, newBusinesses, dailyRevenue] = await Promise.all([
    User.countDocuments({ createdAt: { $lt: start } }),
    Business.countDocuments({ isActive: true, createdAt: { $lt: start } }),
    revenueUntil(start),
    createdByDay(User, {}, start),
    createdByDay(Business, { isActive: true }, start),
    revenueByDay(start),
  ]);

  let users = usersBefore;
  let businesses = businessesBefore;
  let revenue = revenueBefore;
  const series = keys.map((date) => {
    users += newUsers.get(date) || 0;
    businesses += newBusinesses.get(date) || 0;
    revenue += dailyRevenue.get(date) || 0;
    return { date, users, businesses, revenue: Math.round(revenue * 100) / 100 };
  });
  res.json({ success: true, range, series });
});

const httpImage = (url) => (typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null);

const offerState = (offer, now) => {
  if (offer.status === 'pending_review') return 'pending';
  if (offer.status === 'rejected') return 'rejected';
  if (offer.status === 'suspended' || offer.isActive === false) return 'inactive';
  if (offer.expiresAt && offer.expiresAt < now) return 'expired';
  if (offer.startsAt && offer.startsAt > now) return 'scheduled';
  return 'active';
};

const planDuration = (days) => {
  if (!days) return '';
  if (days % 365 === 0) return `${days / 365} Year${days === 365 ? '' : 's'}`;
  if (days % 30 === 0) return `${days / 30} Month${days === 30 ? '' : 's'}`;
  return `${days} Days`;
};

// Poster titles carry their own line breaks ("GOOD FOOD.\nGOOD MOOD."); lists want one line.
const oneLine = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value);
const joinParts = (...parts) => parts.map(oneLine).filter(Boolean).join(' • ');

const TOP_CATEGORIES = 5;
const ACTIVITY_LIMIT = 10;

const getInsights = asyncHandler(async (_req, res) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const { keys, start } = dayWindow(7);
  const perCity = (Model) => Model.aggregate([
    { $match: { isActive: true, city: { $ne: null } } },
    { $group: { _id: '$city', count: { $sum: 1 }, recent: { $sum: { $cond: [{ $gte: ['$createdAt', weekAgo] }, 1, 0] } } } },
  ]);

  const [categoryRows, businessCities, workerCities, dailyRevenue, offers, workers, approvedOffers, newBusinesses, subscriptionPayments, users] = await Promise.all([
    Business.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { $trim: { input: { $ifNull: ['$category', ''] } } }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    perCity(Business),
    perCity(Worker),
    revenueByDay(start),
    Offer.find({}, { title: 1, category: 1, imageUrls: { $slice: 1 }, 'cardDesign.previewUrl': 1, status: 1, isActive: 1, startsAt: 1, expiresAt: 1, createdAt: 1, business: 1 })
      .sort({ createdAt: -1 }).limit(4).populate('business', 'name').lean(),
    Worker.find({}, { name: 1, categories: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).populate('categories', 'name').lean(),
    Offer.find({ status: 'approved', moderatedAt: { $ne: null } }, { title: 1, moderatedAt: 1, business: 1 })
      .sort({ moderatedAt: -1 }).limit(ACTIVITY_LIMIT).populate('business', 'name').lean(),
    Business.find({}, { name: 1, category: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).lean(),
    Payment.find({ type: 'subscription', status: 'verified' }, { planSnapshot: 1, verifiedAt: 1, createdAt: 1, business: 1 })
      .sort({ verifiedAt: -1, createdAt: -1 }).limit(ACTIVITY_LIMIT).populate('business', 'name').lean(),
    User.find({}, { name: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).lean(),
  ]);

  const categoryTotal = categoryRows.reduce((sum, row) => sum + row.count, 0);
  const named = categoryRows.map((row) => ({ category: row._id || 'Uncategorised', count: row.count }));
  const categories = named.slice(0, TOP_CATEGORIES);
  const others = named.slice(TOP_CATEGORIES).reduce((sum, row) => sum + row.count, 0);
  if (others) categories.push({ category: 'Others', count: others });

  const cityTotals = new Map();
  [...businessCities, ...workerCities].forEach((row) => {
    const key = String(row._id);
    const current = cityTotals.get(key) || { count: 0, recent: 0 };
    cityTotals.set(key, { count: current.count + row.count, recent: current.recent + row.recent });
  });
  const cityDocs = await City.find({ _id: { $in: [...cityTotals.keys()] } }, { name: 1 }).lean();
  const topCities = cityDocs
    .map((city) => {
      const { count, recent } = cityTotals.get(String(city._id));
      const previous = count - recent;
      return { cityId: String(city._id), name: city.name, count, growth: previous > 0 ? Math.round((recent / previous) * 1000) / 10 : null };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activity = [
    ...workers.map((w) => ({ id: `provider-${w._id}`, type: 'provider', title: 'New provider registered', subtitle: joinParts(w.name, w.categories?.[0]?.name), at: w.createdAt })),
    ...approvedOffers.map((o) => ({ id: `offer-${o._id}`, type: 'offer', title: 'Offer activated', subtitle: joinParts(o.title, o.business?.name), at: o.moderatedAt })),
    ...newBusinesses.map((b) => ({ id: `business-${b._id}`, type: 'business', title: 'New business added', subtitle: joinParts(b.name, b.category), at: b.createdAt })),
    ...subscriptionPayments.map((p) => ({ id: `subscription-${p._id}`, type: 'subscription', title: 'Subscription plan purchased', subtitle: joinParts(p.planSnapshot?.name, planDuration(p.planSnapshot?.durationDays), p.business?.name), at: p.verifiedAt || p.createdAt })),
    ...users.map((u) => ({ id: `user-${u._id}`, type: 'user', title: 'New user registered', subtitle: u.name || 'Profile not completed yet', at: u.createdAt })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, ACTIVITY_LIMIT);

  res.json({
    success: true,
    categoryDistribution: { total: categoryTotal, categories },
    topCities,
    revenueLast7Days: keys.map((date) => ({ date, revenue: Math.round((dailyRevenue.get(date) || 0) * 100) / 100 })),
    recentOffers: offers.map((offer) => ({
      _id: String(offer._id),
      title: oneLine(offer.title) || 'Untitled offer',
      category: offer.category || '',
      businessName: offer.business?.name || '',
      imageUrl: httpImage(offer.cardDesign?.previewUrl) || httpImage(offer.imageUrls?.[0]),
      state: offerState(offer, now),
      createdAt: offer.createdAt,
    })),
    recentActivity: activity,
  });
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SEARCH_LIMIT = 5;

// Header search: a few matches per entity, enough to jump to the right screen.
const search = asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim();
  const pattern = new RegExp(escapeRegex(term), 'i');
  const digits = term.replace(/\D/g, '');
  const phoneMatch = digits.length >= 4 ? [{ phone: new RegExp(escapeRegex(digits)) }] : [];
  const [users, businesses, offers, providers, cities] = await Promise.all([
    User.find({ $or: [{ name: pattern }, ...phoneMatch] }, { name: 1, phone: 1 }).limit(SEARCH_LIMIT).lean(),
    Business.find({ name: pattern }, { name: 1, category: 1 }).limit(SEARCH_LIMIT).lean(),
    Offer.find({ title: pattern }, { title: 1, category: 1, status: 1 }).limit(SEARCH_LIMIT).lean(),
    Worker.find({ $or: [{ name: pattern }, ...phoneMatch] }, { name: 1, phone: 1 }).limit(SEARCH_LIMIT).lean(),
    City.find({ name: pattern }, { name: 1, state: 1 }).limit(SEARCH_LIMIT).lean(),
  ]);
  res.json({
    success: true,
    results: {
      users: users.map((u) => ({ id: String(u._id), label: u.name || u.phone, detail: u.name ? u.phone : '' })),
      businesses: businesses.map((b) => ({ id: String(b._id), label: b.name, detail: b.category || '' })),
      offers: offers.map((o) => ({ id: String(o._id), label: oneLine(o.title), detail: o.category || '' })),
      providers: providers.map((w) => ({ id: String(w._id), label: w.name, detail: w.phone || '' })),
      cities: cities.map((c) => ({ id: String(c._id), label: c.name, detail: c.state || '' })),
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

module.exports = { getStats, getRevenueSeries, getPerformance, getInsights, search };
