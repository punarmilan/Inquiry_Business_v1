import type { ServiceBooking } from '../types/hyperlocal';

export const BOOKING_CHAT_ACTIVE_STATUSES: ReadonlyArray<ServiceBooking['status']> = [
  'assigned',
  'in_progress',
];

export const canUseBookingChat = (booking: Pick<ServiceBooking, 'status'>) =>
  BOOKING_CHAT_ACTIVE_STATUSES.includes(booking.status);

export const bookingChatUnavailableMessage = (booking: Pick<ServiceBooking, 'status'>) =>
  booking.status === 'completed'
    ? 'Booking is completed. Chat is no longer available for this booking.'
    : 'Chat is no longer available for this booking.';
