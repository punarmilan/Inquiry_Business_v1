const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const AiChatMessage = require('../models/AiChatMessage');

const HISTORY_LIMIT = 20;
const AI_TIMEOUT_MS = 45_000;

const SYSTEM_PROMPT = `You are the in-app AI assistant for InquiryExperts, a hyperlocal app for nearby offers, local services, providers, bookings, and business profiles.
Answer questions about using the app: finding offers and services, managing bookings, provider workflows, business profiles, payments, ratings, and account settings.
Keep replies short, friendly, and in plain language. If asked something unrelated to the app or outside your knowledge, say so honestly and suggest contacting human support (Call or Email Support on the Help & Support screen).`;

const createAiChatService = ({ MessageModel = AiChatMessage, fetchImpl = fetch, timeoutMs = AI_TIMEOUT_MS } = {}) => {
  const callOllama = async (messages) => {
    // Explicit ref'd timer (not AbortSignal.timeout): its internal timer is
    // unref'd and does not keep the event loop alive, so on a drained loop a
    // slow provider would hang forever instead of timing out. This controller
    // guarantees the abort is delivered and the caller always settles.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(`${env.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.ollamaModel,
          stream: false,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new ApiError(504, 'The AI assistant took too long to respond. Please try again.', 'AI_TIMEOUT');
      }
      throw new ApiError(503, 'The AI assistant is temporarily unavailable. Please try again later.', 'AI_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const upstream = await res.json().catch(() => ({}));
      const missingModel = res.status === 404 || /model.*(not found|required)/i.test(String(upstream.error || ''));
      throw new ApiError(
        missingModel ? 503 : 502,
        missingModel
          ? 'The AI assistant model is not available on the server.'
          : 'The AI assistant could not complete the request. Please try again.',
        missingModel ? 'AI_MODEL_UNAVAILABLE' : 'AI_UPSTREAM_ERROR'
      );
    }

    const data = await res.json();
    const reply = data.message?.content?.trim();
    if (!reply) throw new ApiError(502, 'The AI assistant returned an empty response. Please try again.', 'AI_EMPTY_RESPONSE');
    return reply;
  };

  const getHistory = ({ userId, limit = 50 }) =>
    MessageModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .then((docs) => docs.reverse());

  const askAssistant = async ({ userId, text }) => {
    const history = await getHistory({ userId, limit: HISTORY_LIMIT });
    const reply = await callOllama([
      ...history.map((message) => ({ role: message.role, content: message.text })),
      { role: 'user', content: text },
    ]);

    // Persist the completed turn together. A provider failure no longer leaves
    // an orphan user message that looks unanswered after the screen is reopened.
    const [userMessage, assistantMessage] = await MessageModel.insertMany([
      { user: userId, role: 'user', text },
      { user: userId, role: 'assistant', text: reply },
    ]);
    return { userMessage, assistantMessage };
  };

  return { askAssistant, callOllama, getHistory };
};

module.exports = { createAiChatService, ...createAiChatService() };
