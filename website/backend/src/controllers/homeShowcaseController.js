const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const Offer = require('../models/Offer');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const KEY = 'offers_home_showcase';
const emptyShowcase = () => ({
  banner: { imageUrl: '', title: '', subtitle: '', buttonText: '' },
  trendingOfferIds: [],
});

const listPosterCandidates = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const now = new Date();
  const match = {
    status: 'approved', isActive: true,
    startsAt: { $lte: now }, expiresAt: { $gte: now },
    $or: [
      { 'cardDesign.canvas.width': { $gt: 0 }, 'cardDesign.canvas.height': { $gt: 0 }, 'cardDesign.canvas.elements.0': { $exists: true } },
      { 'cardDesign.templateId': 'poster-upload', 'imageUrls.0': { $exists: true } },
    ],
  };
  if (req.query.cityId) match.city = new mongoose.Types.ObjectId(req.query.cityId);
  if (req.query.search) match.title = { $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const [result] = await Offer.aggregate([
    { $match: match },
    { $lookup: { from: 'businesses', localField: 'business', foreignField: '_id', as: 'businessDocument' } },
    { $unwind: '$businessDocument' },
    { $match: { 'businessDocument.isActive': true, 'businessDocument.verificationStatus': 'verified' } },
    { $lookup: { from: 'cities', localField: 'city', foreignField: '_id', as: 'cityDocument' } },
    { $unwind: '$cityDocument' },
    { $match: { 'cityDocument.isActive': true, 'cityDocument.offersEnabled': true } },
    { $sort: { createdAt: -1 } },
    { $facet: {
      data: [
        { $skip: skip }, { $limit: limit },
        { $project: {
          title: 1, description: 1, category: 1, originalPrice: 1, offerPrice: 1, discountPercentage: 1,
          imageUrls: 1, cardDesign: 1, status: 1, isActive: 1, isFeatured: 1, startsAt: 1, expiresAt: 1,
          business: { _id: '$businessDocument._id', name: '$businessDocument.name', isActive: '$businessDocument.isActive', verificationStatus: '$businessDocument.verificationStatus' },
          city: { _id: '$cityDocument._id', name: '$cityDocument.name', isActive: '$cityDocument.isActive', offersEnabled: '$cityDocument.offersEnabled' },
        } },
      ],
      meta: [{ $count: 'total' }],
    } },
  ]);
  res.json({ success: true, ...paginatedResponse({ data: result?.data || [], total: result?.meta[0]?.total || 0, page, limit }) });
});

const getHomeShowcase = asyncHandler(async (_req, res) => {
  const setting = await Setting.findOne({ key: KEY }).lean();
  const showcase = setting?.value || emptyShowcase();
  const ids = showcase.trendingOfferIds || [];
  const offers = await Offer.find({ _id: { $in: ids } })
    .select('title description category originalPrice offerPrice discountPercentage imageUrls cardDesign status isActive isFeatured startsAt expiresAt city business')
    .populate('city', 'name isActive offersEnabled')
    .populate('business', 'name isActive verificationStatus')
    .lean();
  const byId = new Map(offers.map((offer) => [String(offer._id), offer]));
  res.json({ success: true, showcase, selectedOffers: ids.map((id) => byId.get(String(id))).filter(Boolean) });
});

const updateHomeShowcase = asyncHandler(async (req, res) => {
  const { banner, trendingOfferIds } = req.body;
  if (trendingOfferIds.length) {
    const now = new Date();
    const offers = await Offer.find({
      _id: { $in: trendingOfferIds.map((id) => new mongoose.Types.ObjectId(id)) },
      status: 'approved', isActive: true, startsAt: { $lte: now }, expiresAt: { $gte: now },
    }).populate('city', 'isActive offersEnabled').populate('business', 'isActive verificationStatus');
    if (offers.length !== trendingOfferIds.length || offers.some((offer) =>
      !offer.city?.isActive || !offer.city?.offersEnabled || !offer.business?.isActive || offer.business?.verificationStatus !== 'verified'
      || !((offer.cardDesign?.canvas?.width > 0 && offer.cardDesign?.canvas?.height > 0 && offer.cardDesign?.canvas?.elements?.length > 0)
        || (offer.cardDesign?.templateId === 'poster-upload' && offer.imageUrls?.[0]))
    )) throw new ApiError(422, 'Select live user-designed or uploaded posters from verified businesses', 'SHOWCASE_OFFER_NOT_LIVE');
  }
  const value = { banner, trendingOfferIds };
  await Setting.findOneAndUpdate(
    { key: KEY },
    { $set: { type: 'json', value, updatedBy: req.admin._id } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ success: true, showcase: value });
});

module.exports = { getHomeShowcase, updateHomeShowcase, listPosterCandidates };
