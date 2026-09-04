const Chat = require('../models/Chat');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');

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

const findOrCreateBookingChat = async ({ bookingId, customerId, workerUserId }) =>
  Chat.findOneAndUpdate(
    { booking: bookingId, applicant: workerUserId },
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
  participantRole,
  findOrCreateChat,
  findOrCreateBookingChat,
  postSystemMessage,
  postMessage,
  markRead,
};
