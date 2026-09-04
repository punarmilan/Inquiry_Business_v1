const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Rating = require('../models/Rating');
const WalletTransaction = require('../models/WalletTransaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { toGeoPoint } = require('../utils/location');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const env = require('../config/env');

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const requireRegistrationFields = (body, user) => {
  if (user.name) return;

  const hasExistingLocation = Array.isArray(user.location?.coordinates) && user.location.coordinates.length === 2;
  const missing = [];
  if (!body.name) missing.push('name');
  if (!body.password && !user.passwordHash) missing.push('password');
  if (!body.termsAccepted) missing.push('termsAccepted');
  // Discovery location is requested contextually after login and always has a
  // manual city/area fallback, so registration itself must not be blocked.

  if (missing.length) {
    throw new ApiError(422, `Missing required registration fields: ${missing.join(', ')}`, 'REGISTRATION_FIELDS_REQUIRED');
  }
};

const nested = (value) => (typeof value?.toObject === 'function' ? value.toObject() : value || {});
const hasChangedReviewField = (bodySection, existingSection, fields) =>
  fields.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(bodySection, field) &&
      JSON.stringify(bodySection[field] ?? '') !== JSON.stringify(existingSection[field] ?? '')
  );
const hasCategoryDocument = (kyc, category) =>
  (kyc.categoryDocuments ?? []).some((document) => document.category === category && hasText(document.documentUrl)) ||
  (['delivery', 'driver'].includes(category) && hasText(kyc.drivingLicenseUrl));
const hasRequiredCategoryDocuments = (kyc, workerProfile) =>
  (workerProfile.preferredWorkCategories ?? []).every((category) => hasCategoryDocument(kyc, category));

const profilePayload = async (body, user) => {
  const payload = { ...body };
  if (body.location) {
    payload.location = toGeoPoint(body.location);
  }
  // Email now doubles as an optional login identifier (see authController's email+OTP
  // path), so two accounts sharing one email would make login ambiguous. Enforced here
  // rather than a DB unique index, since existing users already have `email: ''` by
  // default and a blind unique index would collide across all of them.
  if (body.email && body.email !== user.email) {
    const emailTaken = await User.exists({ email: body.email, _id: { $ne: user._id } });
    if (emailTaken) {
      throw new ApiError(409, 'This email is already in use by another account', 'EMAIL_ALREADY_IN_USE');
    }
  }
  if (body.kyc) {
    const existingKyc = nested(user.kyc);
    const kyc = { ...existingKyc, ...body.kyc };
    const hasCoreDocs = !!kyc.aadhaarCardUrl && !!kyc.selfieUrl;
    const docsChanged = hasChangedReviewField(body.kyc, existingKyc, [
      'aadhaarCardUrl',
      'selfieUrl',
      'drivingLicenseUrl',
      'categoryDocuments',
    ]);
    const workerProfile = body.workerProfile || nested(user.workerProfile);
    const readyForReview = hasCoreDocs && hasRequiredCategoryDocuments(kyc, workerProfile);
    if (readyForReview && (kyc.status !== 'verified' || docsChanged)) {
      kyc.status = 'submitted';
      kyc.submittedAt = kyc.submittedAt || new Date();
      kyc.verifiedAt = undefined;
      kyc.rejectionReason = '';
    } else if (!readyForReview && ['submitted', 'verified'].includes(kyc.status)) {
      kyc.status = 'not_started';
      kyc.verifiedAt = undefined;
    } else if (!readyForReview && !kyc.status) {
      kyc.status = 'not_started';
    }
    payload.kyc = kyc;
  }
  if (body.wallet) {
    const existingWallet = nested(user.wallet);
    const wallet = { ...existingWallet, ...body.wallet };
    const hasUpi = !!wallet.upiId;
    const hasBank = !!wallet.bankAccountNumber && !!wallet.bankAccountHolderName && !!wallet.ifscCode;
    const hasPaymentDetails = hasUpi || hasBank;
    const paymentDetailsChanged = hasChangedReviewField(body.wallet, existingWallet, [
      'upiId',
      'bankAccountNumber',
      'bankAccountHolderName',
      'ifscCode',
      'panNumber',
    ]);
    wallet.setupCompletedAt = hasPaymentDetails ? wallet.setupCompletedAt || new Date() : undefined;
    if (hasPaymentDetails && (wallet.status !== 'verified' || paymentDetailsChanged)) {
      wallet.status = 'submitted';
      wallet.submittedAt = wallet.submittedAt || new Date();
      wallet.verifiedAt = undefined;
      wallet.rejectionReason = '';
    } else if (!hasPaymentDetails && ['submitted', 'verified'].includes(wallet.status)) {
      wallet.status = 'not_started';
      wallet.verifiedAt = undefined;
    } else if (!hasPaymentDetails && !wallet.status) {
      wallet.status = 'not_started';
    }
    payload.wallet = wallet;
  }
  if (body.password) {
    payload.passwordHash = await bcrypt.hash(body.password, env.bcryptSaltRounds);
  }
  delete payload.password;
  // accountType is only settable on this endpoint during the very first profile submission
  // (requireRegistrationFields uses the same !user.name check to detect that moment). Once an
  // account exists, changing it requires an admin-approved request — see requestAccountTypeChange.
  delete payload.accountType;
  delete payload.workerProfile;
  delete payload.employerProfile;
  return payload;
};

const syncProviderPhoto = async (user, payload) => {
  if (payload.photoUrl === undefined) return;
  await Worker.updateOne({ user: user._id }, { $set: { photoUrl: payload.photoUrl } });
};

const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

const upsertProfile = asyncHandler(async (req, res) => {
  requireRegistrationFields(req.body, req.user);
  const payload = await profilePayload(req.body, req.user);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true, runValidators: true });
  await syncProviderPhoto(user, payload);
  res.json({ success: true, user });
});

const updateProfile = asyncHandler(async (req, res) => {
  requireRegistrationFields(req.body, req.user);
  const payload = await profilePayload(req.body, req.user);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true, runValidators: true });
  await syncProviderPhoto(user, payload);
  res.json({ success: true, user });
});

const requestAccountTypeChange = asyncHandler(async (req, res) => {
  throw new ApiError(410, 'Public worker and employer modes have been retired', 'LEGACY_ACCOUNT_TYPE_RETIRED');
});

const cancelAccountTypeChangeRequest = asyncHandler(async (req, res) => {
  throw new ApiError(410, 'Public worker and employer modes have been retired', 'LEGACY_ACCOUNT_TYPE_RETIRED');
});

const getUserRating = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name phone ratingAverage ratingCount jobsCompletedCount');
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const latestRatings = await Rating.find({ ratedUser: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('ratedBy', 'name photoUrl');

  res.json({
    success: true,
    rating: {
      average: user.ratingAverage,
      count: user.ratingCount,
      latest: latestRatings,
    },
  });
});

const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name photoUrl accountType workerProfile kyc.status ratingAverage ratingCount jobsCompletedCount createdAt'
  );
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const latestRatings = await Rating.find({ ratedUser: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('ratedBy', 'name photoUrl');

  res.json({
    success: true,
    profile: {
      _id: user._id,
      name: user.name,
      photoUrl: user.photoUrl,
      accountType: user.accountType,
      skills: user.workerProfile?.skills ?? [],
      experienceYears: user.workerProfile?.experienceYears,
      isKycVerified: user.kyc?.status === 'verified',
      ratingAverage: user.ratingAverage,
      ratingCount: user.ratingCount,
      jobsCompletedCount: user.jobsCompletedCount,
      memberSince: user.createdAt,
      reviews: latestRatings.map((rating) => ({
        _id: rating._id,
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt,
        raterName: rating.ratedBy?.name,
        raterPhotoUrl: rating.ratedBy?.photoUrl,
      })),
    },
  });
});

const requireWalletVerified = (user) => {
  if (user.wallet?.status !== 'verified') {
    throw new ApiError(422, 'Wallet setup must be approved before you can use it', 'WALLET_NOT_VERIFIED');
  }
};

const addMoney = asyncHandler(async (req, res) => {
  const user = req.user;
  requireWalletVerified(user);

  user.wallet.balance = (user.wallet.balance || 0) + req.body.amount;
  await user.save();

  const transaction = await WalletTransaction.create({
    user: user._id,
    type: 'credit',
    source: 'add_money',
    amount: req.body.amount,
    status: 'completed',
    balanceAfter: user.wallet.balance,
  });

  res.json({ success: true, user, transaction });
});

const requestWithdrawal = asyncHandler(async (req, res) => {
  const user = req.user;
  requireWalletVerified(user);

  const currentBalance = user.wallet.balance || 0;
  if (req.body.amount > currentBalance) {
    throw new ApiError(422, 'Withdrawal amount exceeds available balance', 'INSUFFICIENT_BALANCE');
  }

  user.wallet.balance = currentBalance - req.body.amount;
  await user.save();

  const transaction = await WalletTransaction.create({
    user: user._id,
    type: 'debit',
    source: 'withdrawal',
    amount: req.body.amount,
    status: 'pending',
    balanceAfter: user.wallet.balance,
  });

  res.json({ success: true, user, transaction });
});

const listWalletTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { user: req.user._id };

  const [data, total] = await Promise.all([
    WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    WalletTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data, total, page, limit }) });
});

module.exports = {
  getProfile,
  upsertProfile,
  updateProfile,
  requestAccountTypeChange,
  cancelAccountTypeChangeRequest,
  getUserRating,
  getPublicProfile,
  addMoney,
  requestWithdrawal,
  listWalletTransactions,
};
