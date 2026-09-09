const Worker = require('../models/Worker');
const ServiceBooking = require('../models/ServiceBooking');

const ACTIVE_PROVIDER_BOOKING_STATUSES = Object.freeze(['assigned', 'in_progress']);

const createProviderAvailabilityService = ({ WorkerModel = Worker, BookingModel = ServiceBooking } = {}) => {
  const hasBlockingBooking = (providerId) =>
    BookingModel.exists({
      worker: providerId,
      status: { $in: ACTIVE_PROVIDER_BOOKING_STATUSES },
    });

  // This compare-and-set is shared by every admin assignment path so two
  // concurrent requests cannot reserve the same provider.
  const acquireProvider = (providerId, extraFilter = {}) =>
    WorkerModel.findOneAndUpdate(
      {
        _id: providerId,
        isActive: true,
        verificationStatus: 'verified',
        availability: 'available',
        ...extraFilter,
      },
      { $set: { availability: 'busy' } },
      { new: true, runValidators: true }
    );

  const releaseProviderIfIdle = async (providerId) => {
    if (await hasBlockingBooking(providerId)) return null;
    return WorkerModel.findOneAndUpdate(
      { _id: providerId, availability: 'busy' },
      { $set: { availability: 'available' } },
      { new: true, runValidators: true }
    );
  };

  const setManualAvailability = async (providerId, availability) => {
    if (availability !== 'busy' && (await hasBlockingBooking(providerId))) {
      return { provider: null, blockedByBooking: true };
    }

    const filter = { _id: providerId };
    if (availability !== 'busy') filter.availability = { $ne: 'busy' };
    const provider = await WorkerModel.findOneAndUpdate(
      filter,
      { $set: { availability } },
      { new: true, runValidators: true }
    );
    if (provider) return { provider, blockedByBooking: false };

    return {
      provider: null,
      blockedByBooking: availability !== 'busy' && Boolean(await hasBlockingBooking(providerId)),
    };
  };

  return { acquireProvider, hasBlockingBooking, releaseProviderIfIdle, setManualAvailability };
};

module.exports = {
  ACTIVE_PROVIDER_BOOKING_STATUSES,
  createProviderAvailabilityService,
  ...createProviderAvailabilityService(),
};
