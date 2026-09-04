const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceKm = (from, to) => {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const isWithinOfferRadius = (from, to, radiusKm = 10) => distanceKm(from, to) <= Math.min(radiusKm, 25);

const isOfferPublicEligible = ({ offer, city, userLocation, now = new Date(), radiusKm = 10 }) => {
  if (!city?.isActive || !city?.offersEnabled) return false;
  if (offer.status !== 'approved' || !offer.isActive) return false;
  if (new Date(offer.startsAt) > now || new Date(offer.expiresAt) < now) return false;
  if (!userLocation || !offer.location?.coordinates) return false;
  const [longitude, latitude] = offer.location.coordinates;
  return isWithinOfferRadius(userLocation, { latitude, longitude }, radiusKm);
};

const hasEligibleSubscription = (subscription, now = new Date()) =>
  Boolean(
    subscription &&
      subscription.status === 'active' &&
      new Date(subscription.startsAt) <= now &&
      new Date(subscription.endsAt) >= now
  );

const hasPostingQuota = (subscription) =>
  hasEligibleSubscription(subscription) &&
  (subscription.quota.offerPostingLimit === -1 ||
    subscription.usage.offersPosted < subscription.quota.offerPostingLimit);

const isServiceAvailable = (city) => Boolean(city?.isActive && city?.servicesEnabled);

const canAssignWorker = ({ booking, worker }) =>
  Boolean(
    booking &&
      worker &&
      worker.isActive &&
      worker.verificationStatus === 'verified' &&
      worker.availability === 'available' &&
      String(worker.city) === String(booking.city) &&
      worker.categories.map(String).includes(String(booking.category))
  );

const canClientVerifyPayment = () => false;

const canCreateWorker = (role) => ['staff', 'admin', 'superadmin'].includes(role);
const canModerateOffer = (role) => ['staff', 'admin', 'superadmin'].includes(role);
const canEditOffer = ({ offerOwnerId, userId }) => String(offerOwnerId) === String(userId);

module.exports = {
  distanceKm,
  isWithinOfferRadius,
  isOfferPublicEligible,
  hasEligibleSubscription,
  hasPostingQuota,
  isServiceAvailable,
  canAssignWorker,
  canClientVerifyPayment,
  canCreateWorker,
  canModerateOffer,
  canEditOffer,
};
