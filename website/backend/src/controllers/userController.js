const User = require('../models/User');
const Job = require('../models/Job');
const Rating = require('../models/Rating');
const Worker = require('../models/Worker');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { phone: regex }];
  }
  if (req.query.isBlocked !== undefined) filter.isBlocked = req.query.isBlocked;
  if (req.query.isVerified !== undefined) filter['aadhaarVerification.isVerified'] = req.query.isVerified;
  if (req.query.kycStatus) filter['kyc.status'] = req.query.kycStatus;
  if (req.query.walletStatus) filter['wallet.status'] = req.query.walletStatus;
  if (req.query.accountTypeStatus) filter['accountTypeChange.status'] = req.query.accountTypeStatus;
  if (req.query.minRating !== undefined) filter.ratingAverage = { $gte: Number(req.query.minRating) };
  if (req.query.location) filter['location.address'] = new RegExp(req.query.location, 'i');

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: users, total, page, limit }) });
});

const getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  const [jobsPosted, jobsWorked, ratingsReceived] = await Promise.all([
    Job.find({ postedBy: user._id }).sort({ createdAt: -1 }),
    Job.find({ applicants: { $elemMatch: { userId: user._id, status: 'accepted' } } }).sort({ createdAt: -1 }),
    Rating.find({ ratedUser: user._id }).sort({ createdAt: -1 }).populate('ratedBy', 'name photoUrl'),
  ]);

  res.json({ success: true, user, jobsPosted, jobsWorked, ratingsReceived });
});

const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isBlocked: true } }, { new: true });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isBlocked: false } }, { new: true });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false, isBlocked: true } },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  await Worker.updateMany({ user: user._id }, { $set: { isActive: false, availability: 'offline' } });
  res.json({ success: true, user });
});

const verifyUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { 'aadhaarVerification.isVerified': true } },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const approveKyc = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'kyc.status': 'verified',
        'kyc.verifiedAt': new Date(),
        'kyc.rejectionReason': '',
      },
    },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const rejectKyc = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'kyc.status': 'rejected',
        'kyc.rejectionReason': req.body.reason || 'Rejected by admin',
      },
      $unset: {
        'kyc.verifiedAt': '',
      },
    },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const approveWallet = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'wallet.status': 'verified',
        'wallet.verifiedAt': new Date(),
        'wallet.rejectionReason': '',
      },
    },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const rejectWallet = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'wallet.status': 'rejected',
        'wallet.rejectionReason': req.body.reason || 'Rejected by admin',
      },
      $unset: {
        'wallet.verifiedAt': '',
      },
    },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const approveAccountTypeChange = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  if (user.accountTypeChange?.status !== 'pending') {
    throw new ApiError(400, 'No pending account type request for this user', 'ACCOUNT_TYPE_REQUEST_NOT_PENDING');
  }

  user.accountType = user.accountTypeChange.requestedType;
  user.accountTypeChange.status = 'approved';
  user.accountTypeChange.reviewedAt = new Date();
  user.accountTypeChange.rejectionReason = '';
  await user.save();

  res.json({ success: true, user });
});

const rejectAccountTypeChange = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  if (user.accountTypeChange?.status !== 'pending') {
    throw new ApiError(400, 'No pending account type request for this user', 'ACCOUNT_TYPE_REQUEST_NOT_PENDING');
  }

  user.accountTypeChange.status = 'rejected';
  user.accountTypeChange.reviewedAt = new Date();
  user.accountTypeChange.rejectionReason = req.body.reason || 'Rejected by admin';
  await user.save();

  res.json({ success: true, user });
});

module.exports = {
  listUsers,
  getUserDetail,
  blockUser,
  unblockUser,
  deleteUser,
  verifyUser,
  approveKyc,
  rejectKyc,
  approveWallet,
  rejectWallet,
  approveAccountTypeChange,
  rejectAccountTypeChange,
};
