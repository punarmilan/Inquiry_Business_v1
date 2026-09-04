const { verifyAccessToken } = require('../middleware/auth');
const chatService = require('../services/chatService');
const locationService = require('../services/locationService');
const notificationService = require('../services/notificationService');
const Chat = require('../models/Chat');

const locationRoom = (jobId) => `job:${jobId}:location`;
const bookingLocationRoom = (bookingId) => `booking:${bookingId}:location`;

const getLocationContext = ({ jobId, bookingId }) => bookingId
  ? { id: bookingId, room: bookingLocationRoom(bookingId), kind: 'booking' }
  : { id: jobId, room: locationRoom(jobId), kind: 'job' };

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.user = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(new Error(error.code || 'AUTH_TOKEN_INVALID'));
  }
};

const attachSocket = (io) => {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user._id}`);

    socket.on('join_thread', async ({ chatId }, ack) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) throw new Error('CHAT_NOT_FOUND');
        chatService.assertParticipant(chat, socket.user._id);
        socket.join(`chat:${chatId}`);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'CHAT_JOIN_FAILED' });
      }
    });

    socket.on('leave_thread', ({ chatId }) => {
      if (chatId) socket.leave(`chat:${chatId}`);
    });

    socket.on('send_message', async ({ chatId, text }, ack) => {
      try {
        const { message, chat } = await chatService.postMessage({
          chatId,
          senderId: socket.user._id,
          text,
        });
        io.to(`chat:${chat._id}`).emit('message:new', message);
        io.to(`user:${chat.poster}`).emit('thread:updated', { chatId: chat._id.toString() });
        io.to(`user:${chat.applicant}`).emit('thread:updated', { chatId: chat._id.toString() });

        const recipientId = chat.poster.toString() === socket.user._id.toString() ? chat.applicant : chat.poster;
        notificationService
          .notifyUser({
            io,
            userId: recipientId,
            type: 'new_message',
            title: 'New message',
            body: `${socket.user.name || 'Someone'} sent you a message.`,
            data: {
              chatId: chat._id.toString(),
              contextType: chat.contextType || 'job',
              jobId: chat.job?.toString(),
              bookingId: chat.booking?.toString(),
              otherUserId: socket.user._id.toString(),
              otherUserName: socket.user.name || 'User',
              otherUserAvatar: socket.user.photoUrl || undefined,
            },
          })
          .catch(() => {});

        ack?.({ ok: true, message });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'SEND_MESSAGE_FAILED' });
      }
    });

    socket.on('mark_read', async ({ chatId }, ack) => {
      try {
        const chat = await chatService.markRead({ chatId, userId: socket.user._id });
        io.to(`chat:${chat._id}`).emit('message:read', {
          chatId: chat._id.toString(),
          userId: socket.user._id.toString(),
          readAt: new Date().toISOString(),
        });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'MARK_READ_FAILED' });
      }
    });

    // Live location — foreground-only sharing, scoped to one job's room so it's only ever
    // visible to the poster/accepted-worker pair on that specific active job.
    socket.on('location:join', async ({ jobId, bookingId }, ack) => {
      try {
        const context = getLocationContext({ jobId, bookingId });
        if (!context.id) throw new Error('LOCATION_CONTEXT_REQUIRED');
        if (context.kind === 'booking') await locationService.assertCanShareBookingLocation(context.id, socket.user._id);
        else await locationService.assertCanShareLocation(context.id, socket.user._id);
        socket.join(context.room);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'LOCATION_JOIN_FAILED' });
      }
    });

    socket.on('location:update', async ({ jobId, bookingId, latitude, longitude, accuracy, heading, speed }, ack) => {
      try {
        const context = getLocationContext({ jobId, bookingId });
        if (!context.id) throw new Error('LOCATION_CONTEXT_REQUIRED');
        if (context.kind === 'booking') {
          await locationService.assertCanShareBookingLocation(context.id, socket.user._id);
          await locationService.recordBookingLocationUpdate({ bookingId: context.id, userId: socket.user._id, latitude, longitude, accuracy, heading, speed });
        } else {
          await locationService.assertCanShareLocation(context.id, socket.user._id);
          await locationService.recordLocationUpdate({ jobId: context.id, userId: socket.user._id, latitude, longitude, accuracy, heading, speed });
        }
        // userId/timestamp are server-set — never trust those off the payload.
        socket.to(context.room).emit('location:update', {
          jobId,
          bookingId,
          userId: socket.user._id.toString(),
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          timestamp: new Date().toISOString(),
        });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'LOCATION_UPDATE_FAILED' });
      }
    });

    socket.on('location:stop', async ({ jobId, bookingId }, ack) => {
      try {
        const context = getLocationContext({ jobId, bookingId });
        if (!context.id) throw new Error('LOCATION_CONTEXT_REQUIRED');
        if (context.kind === 'booking') {
          await locationService.assertCanShareBookingLocation(context.id, socket.user._id);
          await locationService.stopBookingSharing({ bookingId: context.id, userId: socket.user._id });
        } else {
          await locationService.stopSharing({ jobId: context.id, userId: socket.user._id });
        }
        socket.to(context.room).emit('location:stopped', { jobId, bookingId, userId: socket.user._id.toString() });
        socket.leave(context.room);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'LOCATION_STOP_FAILED' });
      }
    });
  });
};

module.exports = { attachSocket };
