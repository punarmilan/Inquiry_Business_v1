const express = require('express');
const controller = require('../controllers/serviceController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  listServiceCategoriesSchema, listProvidersSchema, createBookingSchema, listBookingsSchema, bookingIdSchema, cancelBookingSchema, rateBookingSchema, providerResponseSchema, providerStatusSchema, providerAvailabilitySchema,
} = require('../validators/hyperlocal.validator');

const router = express.Router();
router.get('/categories', validate(listServiceCategoriesSchema), controller.listCategories);
router.get('/providers', validate(listProvidersSchema), controller.listProviders);
router.get('/bookings', requireAuth, validate(listBookingsSchema), controller.listBookings);
router.post('/bookings', requireAuth, validate(createBookingSchema), controller.createBooking);
router.get('/bookings/:id', requireAuth, validate(bookingIdSchema), controller.getBooking);
router.post('/bookings/:id/chat', requireAuth, validate(bookingIdSchema), controller.openBookingChat);
router.get('/bookings/:id/location', requireAuth, validate(bookingIdSchema), controller.getBookingLocations);
router.post('/bookings/:id/cancel', requireAuth, validate(cancelBookingSchema), controller.cancelBooking);
router.post('/bookings/:id/rating', requireAuth, validate(rateBookingSchema), controller.rateBooking);
router.get('/provider/bookings', requireAuth, validate(listBookingsSchema), controller.listProviderBookings);
router.post('/provider/bookings/:id/respond', requireAuth, validate(providerResponseSchema), controller.respondToProviderBooking);
router.post('/provider/bookings/:id/status', requireAuth, validate(providerStatusSchema), controller.updateProviderBookingStatus);
router.post('/provider/bookings/:id/chat', requireAuth, validate(bookingIdSchema), controller.openProviderBookingChat);
router.patch('/provider/availability', requireAuth, validate(providerAvailabilitySchema), controller.updateProviderAvailability);
module.exports = router;
