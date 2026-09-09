const asyncHandler = require('../utils/asyncHandler');
const aiChatService = require('../services/aiChatService');

const getMessages = asyncHandler(async (req, res) => {
  const messages = await aiChatService.getHistory({ userId: req.user._id, limit: req.query.limit });
  res.json({ success: true, data: messages });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { userMessage, assistantMessage } = await aiChatService.askAssistant({ userId: req.user._id, text: req.body.text });
  res.status(201).json({ success: true, message: assistantMessage, messages: [userMessage, assistantMessage] });
});

module.exports = { getMessages, sendMessage };
