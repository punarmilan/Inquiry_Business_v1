const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createAiChatService } = require('../src/services/aiChatService');

const makeMessageModel = (seed = []) => {
  const documents = seed.map((message, index) => ({ _id: `seed-${index}`, ...message }));
  return {
    documents,
    find: ({ user }) => ({
      sort() {
        return this;
      },
      limit(limit) {
        return Promise.resolve(documents.filter((message) => message.user === user).slice(-limit).reverse());
      },
    }),
    async insertMany(messages) {
      const saved = messages.map((message, index) => ({
        _id: `saved-${documents.length + index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...message,
      }));
      documents.push(...saved);
      return saved;
    },
  };
};

test('TC_03: a real provider response persists and returns the complete user/assistant turn', async () => {
  const MessageModel = makeMessageModel();
  let requestBody;
  const service = createAiChatService({
    MessageModel,
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ message: { content: 'You can book from the Services tab.' } }) };
    },
  });

  const result = await service.askAssistant({ userId: 'user-1', text: 'How do I book a service?' });
  assert.equal(requestBody.messages.at(-1).content, 'How do I book a service?');
  assert.equal(result.userMessage.role, 'user');
  assert.equal(result.assistantMessage.role, 'assistant');
  assert.equal(MessageModel.documents.length, 2);

  const restored = await service.getHistory({ userId: 'user-1', limit: 50 });
  assert.deepEqual(restored.map((message) => message.role), ['user', 'assistant']);
});

test('TC_03: provider failure does not persist an orphan user message', async () => {
  const MessageModel = makeMessageModel();
  const service = createAiChatService({
    MessageModel,
    fetchImpl: async () => {
      throw new Error('ECONNREFUSED');
    },
  });

  await assert.rejects(
    service.askAssistant({ userId: 'user-1', text: 'Help me' }),
    (error) => error.code === 'AI_UNAVAILABLE' && error.statusCode === 503
  );
  assert.equal(MessageModel.documents.length, 0);
});

test('TC_03: missing model and empty responses are explicit failures', async () => {
  const MessageModel = makeMessageModel();
  const missingModel = createAiChatService({
    MessageModel,
    fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ error: 'model not found' }) }),
  });
  await assert.rejects(missingModel.callOllama([]), (error) => error.code === 'AI_MODEL_UNAVAILABLE');

  const empty = createAiChatService({
    MessageModel,
    fetchImpl: async () => ({ ok: true, json: async () => ({ message: { content: '  ' } }) }),
  });
  await assert.rejects(empty.callOllama([]), (error) => error.code === 'AI_EMPTY_RESPONSE');
});

test('TC_03: slow provider requests time out with a useful error', async () => {
  const MessageModel = makeMessageModel();
  const service = createAiChatService({
    MessageModel,
    timeoutMs: 5,
    fetchImpl: async (_url, { signal }) =>
      // AbortSignal.timeout(5) may already be aborted before this mock runs
      // (especially on slow CI); a correct consumer must handle both states.
      new Promise((_resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  });
  await assert.rejects(service.callOllama([]), (error) => error.code === 'AI_TIMEOUT' && error.statusCode === 504);
});

test('TC_03: frontend guards repeated sends and replaces the optimistic message with the persisted pair', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/screens/profile/AiAssistantScreen.tsx'), 'utf8');
  assert.match(source, /sendingRef\.current/);
  assert.match(source, /message\._id !== optimisticUser\._id/);
  assert.match(source, /\.\.\.res\.messages/);
  assert.match(source, /AI_TIMEOUT/);
  assert.doesNotMatch(source, /keyboardVerticalOffset=\{90\}/);
});
