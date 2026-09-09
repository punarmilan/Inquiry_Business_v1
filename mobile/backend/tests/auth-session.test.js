const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const env = require('../src/config/env');
const RefreshToken = require('../src/models/RefreshToken');
const { issueTokenPair, parseDurationMs } = require('../src/utils/tokens');

test('TC_01: refresh-session duration is 30 days', () => {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  assert.equal(parseDurationMs('30d'), thirtyDaysMs);
  assert.equal(parseDurationMs('invalid'), thirtyDaysMs);

  const envSource = fs.readFileSync(path.resolve(__dirname, '../src/config/env.js'), 'utf8');
  const composeSource = fs.readFileSync(path.resolve(__dirname, '../../../docker-compose.yml'), 'utf8');
  const mobileService = composeSource.slice(composeSource.indexOf('mobile-backend:'), composeSource.indexOf('website-backend:'));
  assert.match(envSource, /jwtRefreshExpiresIn:[^\n]+\|\| '30d'/);
  assert.match(mobileService, /JWT_REFRESH_EXPIRES_IN=30d/);
});

test('TC_01: users and providers receive the same renewable token policy', async () => {
  const originalCreate = RefreshToken.create;
  const originalRefreshExpiry = env.jwtRefreshExpiresIn;
  const stored = [];
  RefreshToken.create = async (record) => {
    stored.push(record);
    return record;
  };
  env.jwtRefreshExpiresIn = '30d';

  try {
    for (const role of ['user', 'worker']) {
      const user = { _id: { toString: () => `${role}-id` }, role };
      const pair = await issueTokenPair(user);
      const access = jwt.verify(pair.accessToken, env.jwtAccessSecret);
      const refresh = jwt.verify(pair.refreshToken, env.jwtRefreshSecret);
      assert.equal(access.type, 'access');
      assert.equal(refresh.type, 'refresh');
      assert.equal(refresh.sub, `${role}-id`);
      assert.ok(refresh.exp - refresh.iat >= 30 * 24 * 60 * 60 - 1);
    }
    assert.equal(stored.length, 2);
  } finally {
    RefreshToken.create = originalCreate;
    env.jwtRefreshExpiresIn = originalRefreshExpiry;
  }
});

test('TC_01: refresh rotation rejects stale tokens and has no retry loop', () => {
  const backend = fs.readFileSync(path.resolve(__dirname, '../src/controllers/authController.js'), 'utf8');
  const frontend = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/services/api.ts'), 'utf8');
  assert.match(backend, /storedToken\.revokedAt = new Date\(\)/);
  assert.match(backend, /const tokens = await issueTokenPair\(user\)/);
  assert.match(frontend, /refreshInFlight/);
  assert.match(frontend, /request<T>\(path, \{ \.\.\.options, accessToken: fresh\.accessToken \}, true\)/);
  assert.match(frontend, /!isRetry/);
  assert.match(frontend, /TERMINAL_REFRESH_ERROR_CODES/);
});

test('TC_01: app restart uses encrypted storage and logout revokes the server session', () => {
  const context = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/context/AppContext.tsx'), 'utf8');
  const storage = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/services/sessionStorage.ts'), 'utf8');
  const socket = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/services/socket.ts'), 'utf8');
  assert.match(storage, /SecureStore\.setItemAsync/);
  assert.match(storage, /SecureStore\.getItemAsync/);
  assert.match(storage, /LEGACY_STORAGE_KEY/);
  assert.match(context, /loadSessionTokens\(\)/);
  assert.match(context, /apiLogoutSession\(refreshToken\)/);
  assert.match(context, /clearSessionTokens\(\)/);
  assert.match(socket, /socket\.auth = \{ token: accessToken \}/);
});
