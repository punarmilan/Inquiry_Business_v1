const Job = require('../models/Job');
const JobLocationShare = require('../models/JobLocationShare');
const ServiceBooking = require('../models/ServiceBooking');
const ServiceBookingLocationShare = require('../models/ServiceBookingLocationShare');
const ApiError = require('../utils/ApiError');

const jobParticipantRole = (job, userId) => {
  const id = userId.toString();
  if (job.postedBy.toString() === id) return 'poster';
  if (job.acceptedApplicant?.toString() === id) return 'worker';
  return null;
};

// Location sharing is only ever allowed for the two people actually on an active job —
// never on a job that's merely open/applied-to, and never for anyone else.
const assertCanShareLocation = async (jobId, userId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  const role = jobParticipantRole(job, userId);
  if (!role || !job.acceptedApplicant) {
    throw new ApiError(403, 'You are not part of this job', 'LOCATION_NOT_PARTICIPANT');
  }
  if (job.status !== 'in-progress') {
    throw new ApiError(422, 'Live location is only available while the job is in progress', 'LOCATION_JOB_NOT_ACTIVE');
  }
  return { job, role };
};

const recordLocationUpdate = ({ jobId, userId, latitude, longitude, accuracy, heading, speed }) =>
  JobLocationShare.findOneAndUpdate(
    { job: jobId, user: userId },
    { $set: { isSharing: true, latitude, longitude, accuracy, heading, speed } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const stopSharing = ({ jobId, userId }) =>
  JobLocationShare.findOneAndUpdate({ job: jobId, user: userId }, { $set: { isSharing: false } });

const getSharesForJob = (jobId) => JobLocationShare.find({ job: jobId, isSharing: true });

const assertCanShareBookingLocation = async (bookingId, userId) => {
  const booking = await ServiceBooking.findById(bookingId).populate('worker', 'user');
  if (!booking) throw new ApiError(404, 'Service booking not found', 'BOOKING_NOT_FOUND');
  if (!booking.worker || !['assigned', 'in_progress'].includes(booking.status)) {
    throw new ApiError(422, 'Live location is available after the provider accepts the booking', 'LOCATION_BOOKING_NOT_ACTIVE');
  }
  const requesterId = userId.toString();
  const role = booking.customer.toString() === requesterId
    ? 'customer'
    : booking.worker.user?.toString() === requesterId
      ? 'provider'
      : null;
  if (!role) throw new ApiError(403, 'You are not part of this service booking', 'LOCATION_NOT_PARTICIPANT');
  return { booking, role };
};

const recordBookingLocationUpdate = ({ bookingId, userId, latitude, longitude, accuracy, heading, speed }) =>
  ServiceBookingLocationShare.findOneAndUpdate(
    { booking: bookingId, user: userId },
    { $set: { isSharing: true, latitude, longitude, accuracy, heading, speed } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const stopBookingSharing = ({ bookingId, userId }) =>
  ServiceBookingLocationShare.findOneAndUpdate({ booking: bookingId, user: userId }, { $set: { isSharing: false } });

const getSharesForBooking = (bookingId) => ServiceBookingLocationShare.find({ booking: bookingId, isSharing: true });

module.exports = {
  assertCanShareLocation,
  jobParticipantRole,
  recordLocationUpdate,
  stopSharing,
  getSharesForJob,
  assertCanShareBookingLocation,
  recordBookingLocationUpdate,
  stopBookingSharing,
  getSharesForBooking,
};
