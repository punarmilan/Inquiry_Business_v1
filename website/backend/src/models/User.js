const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined,
      validate: {
        validator(value) {
          return !value || value.length === 2;
        },
        message: 'Coordinates must be [lng, lat].',
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

const aadhaarVerificationSchema = new mongoose.Schema(
  {
    isVerified: {
      type: Boolean,
      default: false,
    },
    maskedLast4: {
      type: String,
      match: /^\d{4}$/,
      default: undefined,
    },
    providerReferenceId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: undefined,
    },
  },
  { _id: false }
);

const workerProfileSchema = new mongoose.Schema(
  {
    skills: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 80,
      default: undefined,
    },
    preferredWorkCategories: {
      type: [String],
      default: [],
    },
    workRadiusKm: {
      type: Number,
      min: 0,
      max: 500,
      default: undefined,
    },
  },
  { _id: false }
);

const employerProfileSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['individual', 'company'],
      default: 'individual',
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
      default: '',
    },
    officeAddress: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    companyLogoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    companyVerificationRequested: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const categoryDocumentSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 120,
      required: true,
    },
    documentUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const kycSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['not_started', 'submitted', 'verified', 'rejected'],
      default: 'not_started',
      index: true,
    },
    aadhaarCardUrl: {
      type: String,
      trim: true,
      default: '',
    },
    selfieUrl: {
      type: String,
      trim: true,
      default: '',
    },
    drivingLicenseUrl: {
      type: String,
      trim: true,
      default: '',
    },
    categoryDocuments: {
      type: [categoryDocumentSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: undefined,
    },
    verifiedAt: {
      type: Date,
      default: undefined,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['not_started', 'submitted', 'verified', 'rejected'],
      default: 'not_started',
      index: true,
    },
    upiId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    bankAccountNumber: {
      type: String,
      trim: true,
      maxlength: 34,
      default: '',
    },
    bankAccountHolderName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 11,
      default: '',
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: '',
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    setupCompletedAt: {
      type: Date,
      default: undefined,
    },
    submittedAt: {
      type: Date,
      default: undefined,
    },
    verifiedAt: {
      type: Date,
      default: undefined,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  { _id: false }
);

// Account type can only be set directly at registration (see requireRegistrationFields /
// profilePayload in mobile/backend's userController.js). Any change after that goes through
// this request, which an admin must approve before `accountType` itself is updated.
const accountTypeChangeSchema = new mongoose.Schema(
  {
    requestedType: {
      type: String,
      enum: ['worker', 'employer', 'both'],
      default: undefined,
    },
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: undefined,
    },
    reviewedAt: {
      type: Date,
      default: undefined,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: undefined,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: undefined,
    },
    languages: {
      type: [String],
      default: [],
    },
    education: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    currentAddress: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    accountType: {
      type: String,
      enum: ['worker', 'employer', 'both'],
      default: 'worker',
      index: true,
    },
    passwordHash: {
      type: String,
      trim: true,
      default: '',
    },
    workerProfile: {
      type: workerProfileSchema,
      default: () => ({}),
    },
    employerProfile: {
      type: employerProfileSchema,
      default: () => ({}),
    },
    kyc: {
      type: kycSchema,
      default: () => ({}),
    },
    wallet: {
      type: walletSchema,
      default: () => ({}),
    },
    accountTypeChange: {
      type: accountTypeChangeSchema,
      default: () => ({}),
    },
    location: {
      type: geoPointSchema,
      default: undefined,
    },
    // Never add or persist a full Aadhaar number. Store only verification metadata.
    aadhaarVerification: {
      type: aadhaarVerificationSchema,
      default: () => ({}),
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    jobsCompletedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    jobsPostedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ['user', 'staff', 'worker', 'admin', 'superadmin'],
      default: 'user',
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
