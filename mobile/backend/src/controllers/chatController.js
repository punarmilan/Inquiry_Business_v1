const Chat = require('../models/Chat');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const chatService = require('../services/chatService');
const notificationService = require('../services/notificationService');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const populateThread = (query) =>
  query
    .populate('job', 'title status')
    .populate('booking', 'bookingNumber status category')
    .populate('poster', 'name phone photoUrl')
    .populate('applicant', 'name phone photoUrl');

const listThreads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const userId = req.user._id;
  const filter = { $or: [{ poster: userId }, { applicant: userId }] };

  const [threads, total] = await Promise.all([
    populateThread(Chat.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limit)),
    Chat.countDocuments(filter),
  ]);

  const data = threads.map((chat) => {
    const isPoster = chat.poster._id.toString() === userId.toString();
    return {
      ...chat.toJSON(),
      otherUser: isPoster ? chat.applicant : chat.poster,
      unreadCount: isPoster ? chat.unreadCount.poster : chat.unreadCount.applicant,
    };
  });

  res.json({ success: true, ...paginatedResponse({ data, total, page, limit }) });
});

const getMessages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const chat = await Chat.findById(req.params.id);
  if (!chat) {
    throw new ApiError(404, 'Conversation not found', 'CHAT_NOT_FOUND');
  }
  chatService.assertParticipant(chat, req.user._id);

  const filter = { chat: chat._id };
  if (req.query.before) {
    filter.createdAt = { $lt: new Date(req.query.before) };
  }

  const [messages, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);

  res.json({
    success: true,
    ...paginatedResponse({ data: messages.reverse(), total, page, limit }),
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { message, chat } = await chatService.postMessage({
    chatId: req.params.id,
    senderId: req.user._id,
    text: req.body.text,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`chat:${chat._id}`).emit('message:new', message);
    io.to(`user:${chat.poster}`).emit('thread:updated', { chatId: chat._id.toString() });
    io.to(`user:${chat.applicant}`).emit('thread:updated', { chatId: chat._id.toString() });
  }

  const recipientId = chat.poster.toString() === req.user._id.toString() ? chat.applicant : chat.poster;
  notificationService
    .notifyUser({
      io,
      userId: recipientId,
      type: 'new_message',
      title: 'New message',
      body: `${req.user.name || 'Someone'} sent you a message.`,
      data: {
        chatId: chat._id.toString(),
        contextType: chat.contextType || 'job',
        jobId: chat.job?.toString(),
        bookingId: chat.booking?.toString(),
        otherUserId: req.user._id.toString(),
        otherUserName: req.user.name || 'User',
        otherUserAvatar: req.user.photoUrl || undefined,
      },
    })
    .catch(() => {});

  res.status(201).json({ success: true, message });
});

const markThreadRead = asyncHandler(async (req, res) => {
  const chat = await chatService.markRead({ chatId: req.params.id, userId: req.user._id });

  const io = req.app.get('io');
  if (io) {
    io.to(`chat:${chat._id}`).emit('message:read', {
      chatId: chat._id.toString(),
      userId: req.user._id.toString(),
      readAt: new Date().toISOString(),
    });
  }

  res.json({ success: true, chat });
});

module.exports = { listThreads, getMessages, sendMessage, markThreadRead };
