const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const Offer = require('../models/Offer');
const asyncHandler = require('../utils/asyncHandler');

const getHomeShowcase = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: 'offers_home_showcase' }).select('value').lean();
  if (!setting) {
    res.json({ success: true, configured: false, banner: null, trendingOffers: [] });
    return;
  }

  const ids = (setting.value?.trendingOfferIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) {
    res.json({ success: true, configured: true, banner: setting.value.banner, trendingOffers: [] });
    return;
  }
  const now = new Date();
  const query = {
    _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
    status: 'approved', isActive: true,
    startsAt: { $lte: now }, expiresAt: { $gte: now },
  };
  if (req.query.cityId) query.city = new mongoose.Types.ObjectId(req.query.cityId);
  const found = await Offer.aggregate([
    { $geoNear: {
      near: { type: 'Point', coordinates: [Number(req.query.longitude), Number(req.query.latitude)] },
      distanceField: 'distanceMeters', maxDistance: Math.min(Number(req.query.radiusKm || 10), 25) * 1000,
      spherical: true, query,
    } },
    { $lookup: { from: 'cities', localField: 'city', foreignField: '_id', as: 'cityDocument' } },
    { $unwind: '$cityDocument' },
    { $match: { 'cityDocument.isActive': true, 'cityDocument.offersEnabled': true } },
    { $lookup: { from: 'businesses', localField: 'business', foreignField: '_id', as: 'businessDocument' } },
    { $unwind: '$businessDocument' },
    { $match: { 'businessDocument.isActive': true, 'businessDocument.verificationStatus': 'verified' } },
    { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] } } },
    { $project: { analytics: 0, moderatedBy: 0, moderationReason: 0, 'businessDocument.verificationNote': 0 } },
  ]);
  // Older showcase settings may still contain photo-only offers. Show only
  // finished user posters in these slots.
  const posters = found.filter((offer) =>
    (offer.cardDesign?.canvas?.width > 0 && offer.cardDesign?.canvas?.height > 0 && offer.cardDesign?.canvas?.elements?.length > 0)
    || (offer.cardDesign?.templateId === 'poster-upload' && offer.imageUrls?.[0])
  );
  // Keep the order set by the admin, not geo distance.
  const order = new Map(ids.map((id, index) => [String(id), index]));
  posters.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
  res.json({ success: true, configured: true, banner: setting.value.banner, trendingOffers: posters });
});

module.exports = { getHomeShowcase };
