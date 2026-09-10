const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { isRateLimitDisabled } = require('../src/config/env');

test('rate-limit bypass matrix: production never bypasses', () => {
  assert.equal(isRateLimitDisabled('production', 'true'), false);
  assert.equal(isRateLimitDisabled('production', 'false'), false);
  assert.equal(isRateLimitDisabled('production', undefined), false);
  assert.equal(isRateLimitDisabled('development', 'true'), true);
  assert.equal(isRateLimitDisabled('development', 'false'), false);
  assert.equal(isRateLimitDisabled('development', undefined), false);
  assert.equal(isRateLimitDisabled('test', 'true'), true);
  assert.equal(isRateLimitDisabled('test', undefined), false);
});

const SERVER_CODE = `
const express = require('express');
const limiters = require('./src/middleware/rateLimiters');
const app = express();
app.use(express.json());
const limiter = process.env.RL_WHICH === 'login' ? limiters.loginLimiter : limiters.pollingLimiter;
app.get('/ping', limiter, (req, res) => res.json({ ok: true }));
app.listen(Number(process.env.RL_PORT), '127.0.0.1', () => console.log('RL_READY'));
`;

// Empty string defeats any local .env value because dotenv never overrides
// variables that already exist in the process environment.
const startServer = (envOverrides) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', SERVER_CODE], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, ...envOverrides },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let settled = false;
    const done = (fn, value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        fn(value);
      }
    };
    const timer = setTimeout(() => {
      child.kill();
      done(reject, new Error(`server did not start: ${output}`));
    }, 15000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('RL_READY')) done(resolve, child);
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', (error) => done(reject, error));
    child.on('exit', (code) => done(reject, new Error(`server exited early (${code}): ${output}`)));
  });

const hit = async (port, count) => {
  const statuses = [];
  let retryAfter = null;
  for (let i = 0; i < count; i += 1) {
    const res = await fetch(`http://127.0.0.1:${port}/ping`);
    statuses.push(res.status);
    if (res.status === 429 && retryAfter === null) retryAfter = res.headers.get('retry-after');
    await res.arrayBuffer();
  }
  return { statuses, retryAfter };
};

test('polling limiter blocks excessive requests by default (dev, no bypass)', async () => {
  const child = await startServer({
    NODE_ENV: 'development',
    DISABLE_RATE_LIMIT: '',
    RATE_LIMIT_MAX: '2',
    RATE_LIMIT_WINDOW_MS: '60000',
    RL_PORT: '5211',
    RL_WHICH: 'polling',
  });
  try {
    const { statuses, retryAfter } = await hit(5211, 4);
    assert.deepEqual(statuses, [200, 200, 429, 429]);
    assert.ok(retryAfter, 'Retry-After header is present on 429');
  } finally {
    child.kill();
  }
});

test('polling limiter is bypassed in development with DISABLE_RATE_LIMIT=true', async () => {
  const child = await startServer({
    NODE_ENV: 'development',
    DISABLE_RATE_LIMIT: 'true',
    RATE_LIMIT_MAX: '2',
    RATE_LIMIT_WINDOW_MS: '60000',
    RL_PORT: '5212',
    RL_WHICH: 'polling',
  });
  try {
    const { statuses } = await hit(5212, 6);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200]);
  } finally {
    child.kill();
  }
});

test('production still rate-limits even with DISABLE_RATE_LIMIT=true', async () => {
  const child = await startServer({
    NODE_ENV: 'production',
    DISABLE_RATE_LIMIT: 'true',
    RATE_LIMIT_MAX: '2',
    RATE_LIMIT_WINDOW_MS: '60000',
    RL_PORT: '5213',
    RL_WHICH: 'polling',
  });
  try {
    const { statuses } = await hit(5213, 4);
    assert.deepEqual(statuses, [200, 200, 429, 429]);
  } finally {
    child.kill();
  }
});

test('login limiter is bypassed in development with DISABLE_RATE_LIMIT=true', async () => {
  const child = await startServer({
    NODE_ENV: 'development',
    DISABLE_RATE_LIMIT: 'true',
    LOGIN_RATE_LIMIT_MAX: '2',
    LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    RL_PORT: '5214',
    RL_WHICH: 'login',
  });
  try {
    const { statuses } = await hit(5214, 5);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200]);
  } finally {
    child.kill();
  }
});
