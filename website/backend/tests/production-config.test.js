const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Evaluate the actual configuration without loading local .env files or secrets.
for (const backend of ['website', 'mobile']) {
  const filename = path.resolve(__dirname, '../../../', backend, 'backend/src/config/env.js');
  const source = fs.readFileSync(filename, 'utf8');
  const load = (values) => {
    const module = { exports: {} };
    vm.runInNewContext(source, { module, __dirname: path.dirname(filename), process: { env: values }, require: (name) => name === 'dotenv' ? { config() {} } : require(name) }, { filename });
    return module.exports;
  };
  test(backend + ' production refuses missing, development and shared signing secrets', () => {
    const secrets = { JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), OTP_PEPPER: 'c'.repeat(40) };
    assert.throws(() => load({ NODE_ENV: 'production' }), /production/i);
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', ...(backend === 'mobile' ? ['OTP_PEPPER'] : [])]) {
      for (const value of ['', 'short', ' '.repeat(40), 'dev-' + 'x'.repeat(40), 'placeholder-' + 'x'.repeat(40)]) {
        assert.throws(() => load({ NODE_ENV: 'production', ...secrets, [key]: value }), /production/i);
      }
    }
    assert.throws(() => load({ NODE_ENV: 'production', ...secrets, JWT_REFRESH_SECRET: secrets.JWT_ACCESS_SECRET }), /distinct/i);
    assert.equal(load({ NODE_ENV: 'production', ...secrets, DISABLE_RATE_LIMIT: 'true' }).rateLimitDisabled, false);
    assert.equal(load({ NODE_ENV: 'development', DISABLE_RATE_LIMIT: 'true' }).rateLimitDisabled, true);
    assert.equal(load({}).nodeEnv, 'development');
  });
}
