const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const childProcess = require('node:child_process');
const { connectionMode, getAdbCandidates, inspectMetro } = require('../scripts/start-expo.cjs');

test('USB and localhost advertise IPv4 loopback and bind Metro in LAN mode', () => {
  for (const flag of ['--usb', '--localhost']) {
    const result = connectionMode({ args: [flag, '--port', '8082'], hostname: '192.168.0.9' });
    assert.equal(result.usb, true);
    assert.equal(result.hostname, '127.0.0.1');
    assert.deepEqual(result.args, ['--port', '8082', '--lan']);
  }
  assert.equal(connectionMode({ args: [], connected: true, hostname: '192.168.0.9' }).hostname, '127.0.0.1');
});

test('explicit LAN/tunnel choices are preserved and contradictory modes reject', () => {
  for (const flag of ['--lan', '--tunnel']) {
    const result = connectionMode({ args: [flag], connected: true, hostname: '192.168.0.9' });
    assert.equal(result.usb, false); assert.equal(result.hostname, '192.168.0.9');
    assert.deepEqual(result.args, [flag]);
  }
  assert.equal(connectionMode({ args: [], connected: false }).usb, false);
  assert.throws(() => connectionMode({ args: ['--usb', '--tunnel'] }));
  assert.throws(() => connectionMode({ args: ['--localhost', '--lan'] }));
});

test('repository platform-tools is an adb fallback independent of PATH and SDK environment', () => {
  assert.ok(getAdbCandidates().includes(path.resolve(__dirname, '../../../platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')));
});

test('existing Metro is reusable only when its manifest identifies this project', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ extra: { expoGo: { developer: { projectRoot: path.resolve(__dirname, '..') } }, expoClient: { hostUri: '127.0.0.1:8081' } } }) }));
  assert.equal((await inspectMetro(8081)).sameProject, true);
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ extra: { expoGo: { developer: { projectRoot: 'C:/another-project' } } } }) }));
  assert.equal((await inspectMetro(8081)).sameProject, false);
  t.mock.method(global, 'fetch', async () => { throw new Error('Offline'); });
  assert.equal((await inspectMetro(8081)).sameProject, false);
});

test('watchdog handles late USB attachment and restores a dropped API tunnel without resetting Metro', (t) => {
  let devices = [];
  const present = new Set([8081]);
  const restored = [];
  t.mock.method(childProcess, 'spawnSync', (_adb, args) => {
    if (args.at(-1) === '--list') return { status: 0, stdout: [...present].map((port) => `UsbFfs tcp:${port} tcp:${port}`).join('\n') };
    const port = Number(args.at(-1).slice(4)); present.add(port); restored.push(port);
    return { status: 0 };
  });
  let tick;
  t.mock.method(global, 'setInterval', (callback) => { tick = callback; return { unref() {} }; });
  t.mock.method(global, 'clearInterval', () => undefined);
  delete require.cache[require.resolve('../scripts/adbReverse.cjs')];
  const { keepReverseAlive } = require('../scripts/adbReverse.cjs');
  const stop = keepReverseAlive({ adbPath: 'test-adb', listDevices: () => devices, ports: [8081, 5000], log: () => undefined, unref: false });
  assert.deepEqual(restored, []);
  devices = ['test-phone']; tick(); assert.deepEqual(restored, [5000]);
  tick(); assert.deepEqual(restored, [5000]);
  present.clear(); tick(); assert.deepEqual(restored, [5000, 8081, 5000]);
  stop();
});

test('reopening a running development client preserves its task instead of reloading its React context', (t) => {
  const calls = []; let running = true;
  t.mock.method(childProcess, 'spawnSync', (_adb, args) => {
    calls.push(args);
    if (args.includes('dumpsys')) return { status: 0, stdout: 'ResumedActivity: ActivityRecord{123 u0 com.inquiryexperts.app/.MainActivity t1}\n * ActivityRecord{456 u0 com.inquiryexperts.app/expo.modules.devlauncher.launcher.errors.DevLauncherErrorActivity t1}' };
    return args.includes('pidof') ? { status: running ? 0 : 1, stdout: running ? '1234\n' : '' } : { status: 0, stdout: '' };
  });
  delete require.cache[require.resolve('../scripts/start-expo.cjs')];
  const { openExistingAndroid } = require('../scripts/start-expo.cjs');
  openExistingAndroid('test-adb', ['phone'], '127.0.0.1:8081');
  assert.ok(calls.at(-1).includes('--activity-reorder-to-front'));
  assert.equal(calls.at(-1).includes('-d'), false);
  running = false; calls.length = 0;
  openExistingAndroid('test-adb', ['phone'], '127.0.0.1:8081');
  assert.ok(calls.at(-1).includes('-d'));
  assert.ok(calls.at(-1).at(-1).includes('127.0.0.1%3A8081'));
});

test('a resumed Expo launch error is closed before reopening the current USB URL', (t) => {
  const calls = [];
  let stopStatus = 0;
  t.mock.method(childProcess, 'spawnSync', (_adb, args) => {
    calls.push(args);
    if (args.includes('pidof')) return { status: 0, stdout: '1234\n' };
    if (args.includes('dumpsys')) return { status: 0, stdout: '  ResumedActivity: ActivityRecord{123 u0 com.inquiryexperts.app/expo.modules.devlauncher.launcher.errors.DevLauncherErrorActivity t1}\n' };
    return { status: args.includes('force-stop') ? stopStatus : 0, stdout: '' };
  });
  delete require.cache[require.resolve('../scripts/start-expo.cjs')];
  const { openExistingAndroid } = require('../scripts/start-expo.cjs');
  openExistingAndroid('test-adb', ['phone'], '127.0.0.1:8081');
  assert.ok(calls.at(-2).includes('force-stop'));
  assert.ok(calls.at(-1).includes('-d'));
  assert.ok(calls.at(-1).at(-1).includes('127.0.0.1%3A8081'));
  assert.equal(calls.some((args) => args.includes('--activity-reorder-to-front')), false);
  stopStatus = 1; calls.length = 0;
  openExistingAndroid('test-adb', ['phone'], '127.0.0.1:8081');
  assert.equal(calls.some((args) => args.includes('-d')), false);
});
