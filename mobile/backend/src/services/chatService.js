const Chat = require('../models/Chat');
const Message = require('../models/Message');
const ServiceBooking = require('../models/ServiceBooking');
const ApiError = require('../utils/ApiError');
const { canUseBookingChat } = require('../domain/rules');

const bookingChatUnavailableError = (booking) => {
  const message = booking?.status === 'completed'
    ? 'Booking is completed. Chat is no longer available for this booking.'
    : 'Chat is no longer available for this booking.';
  return new ApiError(409, message, 'BOOKING_CHAT_UNAVAILABLE');
};

const assertBookingChatAvailable = (booking) => {
  if (!canUseBookingChat(booking)) throw bookingChatUnavailableError(booking);
};

const assertCanAccessThread = async (chat, userId) => {
  const role = assertParticipant(chat, userId);
  if (!chat.booking) return role;

  const booking = await ServiceBooking.findById(chat.booking).select('status');
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  assertBookingChatAvailable(booking);
  return role;
};

// Older deployments created a non-partial { job, applicant } unique index.
// Booking chats have job=null, so that stale index incorrectly permits only one
// booking chat per provider. Remove only that legacy index and create the schema's
// partial indexes before the API starts accepting traffic.
const ensureChatIndexes = async () => {
  const indexes = await Chat.collection.indexes();
  const staleJobIndex = indexes.find((index) =>
    index.unique === true &&
    index.key?.job === 1 &&
    index.key?.applicant === 1 &&
    Object.keys(index.key).length === 2 &&
    !index.partialFilterExpression
  );

  if (staleJobIndex) {
    try {
      await Chat.collection.dropIndex(staleJobIndex.name);
    } catch (error) {
      if (error?.codeName !== 'IndexNotFound' && error?.code !== 27) throw error;
    }
  }
  await Chat.createIndexes();
};

const participantRole = (chat, userId) => {
  const id = userId.toString();
  if (chat.poster.toString() === id) return 'poster';
  if (chat.applicant.toString() === id) return 'applicant';
  return null;
};

const assertParticipant = (chat, userId) => {
  const role = participantRole(chat, userId);
  if (!role) {
    throw new ApiError(403, 'You are not part of this conversation', 'CHAT_NOT_PARTICIPANT');
  }
  return role;
};

const findOrCreateChat = async ({ jobId, posterId, applicantId }) => {
  const chat = await Chat.findOneAndUpdate(
    { job: jobId, applicant: applicantId },
    { $setOnInsert: { job: jobId, poster: posterId, applicant: applicantId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return chat;
};

const findOrCreateBookingChat = async ({ bookingId, customerId, workerUserId }) => {
  const lookup = { booking: bookingId, applicant: workerUserId };

  try {
    return await Chat.findOneAndUpdate(
      lookup,
      {
        $setOnInsert: {
          booking: bookingId,
          contextType: 'booking',
          poster: customerId,
          applicant: workerUserId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // Concurrent first opens can race on the booking/applicant unique index.
    // Only resolve that database duplicate by returning the exact existing chat.
    if (error?.code !== 11000) throw error;

    const existingChat = await Chat.findOne(lookup);
    if (!existingChat) throw error;
    return existingChat;
  }
};

const postSystemMessage = async ({ chatId, senderId, text }) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Conversation not found', 'CHAT_NOT_FOUND');
  }

  const senderRole = assertParticipant(chat, senderId);
  const recipientRole = senderRole === 'poster' ? 'applicant' : 'poster';
  const message = await Message.create({ chat: chat._id, sender: senderId, text });

  chat.lastMessage = text;
  chat.lastMessageAt = message.createdAt;
  chat.lastMessageSender = senderId;
  chat.unreadCount[recipientRole] += 1;
  await chat.save();

  return { message, chat };
};

const postMessage = async ({ chatId, senderId, text }) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Conversation not found', 'CHAT_NOT_FOUND');
  }
  const senderRole = await assertCanAccessThread(chat, senderId);
  const recipientRole = senderRole === 'poster' ? 'applicant' : 'poster';

  const message = await Message.create({ chat: chat._id, sender: senderId, text });

  chat.lastMessage = text;
  chat.lastMessageAt = message.createdAt;
  chat.lastMessageSender = senderId;
  chat.unreadCount[recipientRole] += 1;
  await chat.save();

  return { message, chat };
};

const markRead = async ({ chatId, userId }) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Conversation not found', 'CHAT_NOT_FOUND');
  }
  const role = assertParticipant(chat, userId);
  chat.unreadCount[role] = 0;
  await chat.save();
  return chat;
};

module.exports = {
  assertParticipant,
  assertCanAccessThread,
  assertBookingChatAvailable,
  ensureChatIndexes,
  participantRole,
  findOrCreateChat,
  findOrCreateBookingChat,
  postSystemMessage,
  postMessage,
  markRead,
};
