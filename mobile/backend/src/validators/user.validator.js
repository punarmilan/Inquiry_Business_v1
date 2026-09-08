const { Joi, location } = require('./common');
const { categoryKey } = require('./category.validator');
const { passwordPolicy } = require('./password.validator');

const imageSource = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const isImageSource =
      value === '' ||
      /^https?:\/\//i.test(value) ||
      /^file:\/\//i.test(value) ||
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value);
    if (!isImageSource) return helpers.error('string.uri');
    return value;
  })
  .allow('');

const profileImageSource = Joi.string()
  .trim()
  .max(7_000_000)
  .custom((value, helpers) => {
    const isProfileImage =
      value === '' ||
      /^https?:\/\//i.test(value) ||
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value);
    if (!isProfileImage) return helpers.error('string.uri');
    return value;
  })
  .allow('');

const profileBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  photoUrl: profileImageSource,
  email: Joi.string().trim().email(),
  password: passwordPolicy,
  accountType: Joi.string().valid('worker', 'employer', 'both'),
  termsAccepted: Joi.boolean(),
  termsAcceptedAt: Joi.date().iso(),
  dateOfBirth: Joi.date().max('now').iso(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
  languages: Joi.array().items(Joi.string().trim().min(1).max(40)).max(20),
  education: Joi.string().trim().max(150).allow(''),
  currentAddress: Joi.string().trim().max(300).allow(''),
  workerProfile: Joi.object({
    skills: Joi.array().items(Joi.string().trim().min(1).max(80)).max(30),
    experienceYears: Joi.number().min(0).max(80),
    preferredWorkCategories: Joi.array().items(categoryKey).max(50),
    workRadiusKm: Joi.number().min(0).max(500),
  }).unknown(false),
  employerProfile: Joi.object({
    kind: Joi.string().valid('individual', 'company').default('individual'),
    companyName: Joi.string().trim().max(160).allow(''),
    gstNumber: Joi.string().trim().uppercase().max(20).allow(''),
    officeAddress: Joi.string().trim().max(300).allow(''),
    companyLogoUrl: imageSource,
    companyVerificationRequested: Joi.boolean(),
  }).unknown(false),
  kyc: Joi.object({
    aadhaarCardUrl: imageSource,
    selfieUrl: imageSource,
    drivingLicenseUrl: imageSource,
    categoryDocuments: Joi.array()
      .items(
        Joi.object({
          category: categoryKey.required(),
          label: Joi.string().trim().max(120).required(),
          documentUrl: imageSource,
        }).unknown(false)
      )
      .max(50),
  }).unknown(false),
  wallet: Joi.object({
    upiId: Joi.string().trim().max(100).allow(''),
    bankAccountNumber: Joi.string().trim().max(34).allow(''),
    bankAccountHolderName: Joi.string().trim().max(120).allow(''),
    ifscCode: Joi.string().trim().uppercase().max(11).allow(''),
    panNumber: Joi.string().trim().uppercase().max(10).allow(''),
  }).unknown(false),
  location,
  aadhaarVerification: Joi.forbidden().messages({
    'any.unknown': 'Aadhaar verification can only be updated by a trusted verification flow.',
  }),
  aadhaarNumber: Joi.forbidden().messages({
    'any.unknown': 'Full Aadhaar number must never be sent or stored.',
  }),
  aadhaar: Joi.forbidden().messages({
    'any.unknown': 'Full Aadhaar number must never be sent or stored.',
  }),
})
  .min(1)
  .unknown(false);

const upsertProfileSchema = Joi.object({
  body: profileBody.required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const accountTypeRequestSchema = Joi.object({
  body: Joi.object({
    requestedType: Joi.string().valid('worker', 'employer', 'both').required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = { upsertProfileSchema, accountTypeRequestSchema };
