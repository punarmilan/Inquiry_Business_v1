#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { keepReverseAlive } = require('./adbReverse.cjs');

const DEFAULT_PORT = Number(process.env.EXPO_START_PORT || 8081);
const API_PORT = Number(process.env.EXPO_API_PORT || 5000);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const userArgs = process.argv.slice(2);

const loadPackageJson = () => {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return {};
  }
};

const { dependencies = {}, devDependencies = {} } = loadPackageJson();
const hasDevClientInstalled = Boolean(dependencies['expo-dev-client'] || devDependencies['expo-dev-client']);
// This project includes native modules that Expo Go cannot load. Prefer the
// installed development client; EXPO_USE_DEV_CLIENT=0 remains an explicit
// escape hatch for the rare Expo Go-only session.
const useDevClientByEnv = process.env.EXPO_USE_DEV_CLIENT !== '0';

const hasFlag = (...flags) =>
  userArgs.some((arg, index) => flags.includes(arg) || flags.some((flag) => arg.startsWith(`${flag}=`)));

const hasPortFlag = () => userArgs.some((arg) => arg === '--port' || arg === '-p' || arg.startsWith('--port=') || arg.startsWith('-p='));

const getFlagValue = (...flags) => {
  for (let index = 0; index < userArgs.length; index += 1) {
    const arg = userArgs[index];
    if (flags.includes(arg)) return userArgs[index + 1];

    for (const flag of flags) {
      if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1);
    }
  }

  return undefined;
};

const getRequestedPort = () => {
  const value = getFlagValue('--port', '-p');
  if (!value) return undefined;

  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : undefined;
};

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });

const getLanAddress = () => {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')) {
        return address.address;
      }
    }
  }

  return undefined;
};

const getAdbCandidates = () => {
  const candidates = [];

  if (process.env.ADB) candidates.push(process.env.ADB);
  if (process.env.ANDROID_HOME) candidates.push(path.join(process.env.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));
  if (process.env.ANDROID_SDK_ROOT) candidates.push(path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'));
  }
  candidates.push(path.resolve(PROJECT_ROOT, '../../platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));
  candidates.push('adb');

  return [...new Set(candidates)];
};

const findAdb = () =>
  getAdbCandidates().find((candidate) => {
    const result = spawnSync(candidate, ['version'], { stdio: 'ignore', timeout: 3000 });
    return result.status === 0;
  });

const getConnectedAndroidDevices = (adbPath) => {
  if (!adbPath) return [];

  const result = spawnSync(adbPath, ['devices'], { encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0) return [];

  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => serial);
};

const reversePortForDevices = (adbPath, devices, port) => {
  if (!adbPath || devices.length === 0 || !port) return false;

  let reversed = false;
  for (const serial of devices) {
    const result = spawnSync(adbPath, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], { encoding: 'utf8', timeout: 5000 });
    if (result.status === 0) {
      console.log(`[expo-start] ADB reverse enabled for ${serial} on port ${port}.`);
      reversed = true;
    } else {
      const message = (result.stderr || result.stdout || '').trim();
      console.warn(`[expo-start] ADB reverse failed for ${serial}${message ? `: ${message}` : '.'}`);
    }
  }

  return reversed;
};

const connectionMode = ({ args, connected = false, hostname }) => {
  const tunnel = args.includes('--tunnel');
  const local = args.includes('--usb') || args.includes('--localhost');
  if (tunnel && local) throw new Error('Choose either --usb/--localhost or --tunnel.');
  if (local && args.includes('--lan')) throw new Error('Choose either --usb/--localhost or --lan.');
  // Explicit LAN/tunnel choices retain their meaning. USB advertises IPv4
  // loopback while Metro binds in LAN mode, avoiding Windows IPv6-only binding.
  const usb = local || (!tunnel && !args.includes('--lan') && connected);
  return { usb, tunnel, hostname: usb ? '127.0.0.1' : hostname,
    args: local ? [...args.filter((arg) => !['--usb', '--localhost'].includes(arg)), '--lan'] : args };
};

const inspectMetro = async (port) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { 'expo-platform': 'android', accept: 'application/expo+json,application/json' },
      signal: AbortSignal.timeout(3000),
    });
    const manifest = await response.json();
    const root = manifest.extra?.expoGo?.developer?.projectRoot;
    return { sameProject: response.ok && typeof root === 'string' && path.resolve(root) === PROJECT_ROOT,
      hostUri: manifest.extra?.expoClient?.hostUri };
  } catch { return { sameProject: false }; }
};

const openExistingAndroid = (adbPath, devices, hostUri) => {
  const serial = devices[0];
  if (!serial) { console.warn('[expo-start] Connect and authorize an Android device, then open the local development server in the app.'); return; }
  const go = hasFlag('--go') || (!hasFlag('--dev-client') && (!hasDevClientInstalled || !useDevClientByEnv));
  const app = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'app.json'), 'utf8')).expo;
  const scheme = Array.isArray(app.scheme) ? app.scheme[0] : app.scheme;
  if (!go && !scheme) throw new Error('No app scheme is configured for opening the development client.');
  // Re-entering Dev Launcher's URL loader while React is already initialized
  // can recreate MainActivity before its old context is destroyed. Foreground
  // the existing task instead, keeping navigation and Fast Refresh intact.
  if (!go && app.android?.package) {
    const existing = spawnSync(adbPath, ['-s', serial, 'shell', 'pidof', app.android.package], { encoding: 'utf8', timeout: 5000 });
    if (existing.status === 0 && /^\d+(?:\s+\d+)*$/.test((existing.stdout || '').trim())) {
      const activities = spawnSync(adbPath, ['-s', serial, 'shell', 'dumpsys', 'activity', 'activities'], { encoding: 'utf8', timeout: 5000 });
      const launcherFailed = activities.status === 0 && (activities.stdout || '').split(/\r?\n/).some((line) =>
        /(?:mResumedActivity|ResumedActivity|topResumedActivity|Resumed):\s*ActivityRecord\{/.test(line)
        && line.includes(`${app.android.package}/expo.modules.devlauncher.launcher.errors.DevLauncherErrorActivity`));
      if (launcherFailed) {
        // A live process can be stuck before React starts. Foregrounding it only
        // returns to the error screen; close this failed session before loading
        // the current Metro URL, avoiding overlapping React contexts.
        const stopped = spawnSync(adbPath, ['-s', serial, 'shell', 'am', 'force-stop', app.android.package], { encoding: 'utf8', timeout: 5000 });
        if (stopped.status !== 0) {
          console.warn('[expo-start] Could not close the failed development client; close it on the device and retry.');
          return;
        }
        console.log('[expo-start] Reopening the failed development client with the current Metro URL.');
      } else {
        const broughtForward = spawnSync(adbPath, ['-s', serial, 'shell', 'am', 'start', '-n', `${app.android.package}/.MainActivity`, '--activity-reorder-to-front'], { encoding: 'utf8', timeout: 5000 });
        if (broughtForward.status === 0) console.log('[expo-start] Existing development client brought forward; its React context and navigation are retained.');
        else console.warn('[expo-start] Could not foreground the existing development client; open it from the device.');
        return;
      }
    }
  }
  const url = go ? `exp://${hostUri}` : `${scheme}://expo-development-client/?url=${encodeURIComponent(`http://${hostUri}`)}`;
  const result = spawnSync(adbPath, ['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url], { encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0) console.warn('[expo-start] Could not open the Android development client; open the local server in the app.');
};

const run = async () => {
  const expoArgs = [require.resolve('expo/bin/cli'), 'start'];
  const env = { ...process.env };
  const explicitHostMode = hasFlag('--lan', '--localhost', '--usb', '--tunnel');
  // A native development build normally has Metro configured as localhost:8081.
  // Choosing an arbitrary free port here makes a USB-connected build fail with
  // "Unable to load script" even though Metro is running, so keep the default
  // deterministic. A caller can still deliberately pass --port for another build.
  const selectedPort = hasPortFlag() ? getRequestedPort() : DEFAULT_PORT;
  const adbPath = findAdb();
  const androidDevices = getConnectedAndroidDevices(adbPath).sort((first, second) => {
    const firstIsEmulator = first.startsWith('emulator-');
    const secondIsEmulator = second.startsWith('emulator-');
    return Number(firstIsEmulator) - Number(secondIsEmulator);
  });
  const mode = connectionMode({ args: userArgs, connected: androidDevices.length > 0, hostname: env.REACT_NATIVE_PACKAGER_HOSTNAME });
  const shouldMaintainReverse = !!selectedPort && !mode.tunnel && !!adbPath;
  const shouldTryReverse = shouldMaintainReverse && androidDevices.length > 0;
  const shouldOpenAndroidDirectly = hasFlag('--android') && !hasFlag('--dev-client') && !useDevClientByEnv;
  const expoUserArgs = shouldOpenAndroidDirectly ? mode.args.filter((arg) => arg !== '--android') : mode.args;
  if (mode.hostname) env.REACT_NATIVE_PACKAGER_HOSTNAME = mode.hostname;
  if (mode.usb && !adbPath) throw new Error('USB mode requires adb. Install Android platform-tools or set ADB to its executable.');
  if (!Number.isInteger(selectedPort) || selectedPort < 1 || selectedPort > 65535
    || !Number.isInteger(API_PORT) || API_PORT < 1 || API_PORT > 65535) throw new Error('Metro/API ports must be integers from 1 to 65535.');

  // Expo CLI resolves adb from PATH when it opens Android. The helper above
  // can find adb from ANDROID_HOME/ANDROID_SDK_ROOT even when PATH is missing,
  // so expose that same resolved SDK path to the child Expo process.
  if (adbPath && path.isAbsolute(adbPath)) {
    const adbDirectory = path.dirname(adbPath);
    const currentPath = env.PATH || env.Path || '';
    const pathEntries = currentPath.split(path.delimiter).filter(Boolean);
    if (!pathEntries.some((entry) => entry.toLowerCase() === adbDirectory.toLowerCase())) {
      env.PATH = [adbDirectory, ...pathEntries].join(path.delimiter);
    }
  }

  const portBusy = !(await isPortFree(selectedPort));
  if (portBusy) {
    const metro = await inspectMetro(selectedPort);
    if (!metro.sameProject) throw new Error(`Port ${selectedPort} belongs to another process/project. Stop it or choose --port explicitly.`);
    if (mode.usb && !/^(127\.0\.0\.1|localhost):/.test(metro.hostUri || '')) {
      throw new Error(`Existing Metro advertises ${metro.hostUri || 'an unknown host'}. Restart it once with npm run start:usb to replace the stale LAN address.`);
    }
    if (hasFlag('--clear', '-c', '--tunnel', '--lan')) throw new Error(`Metro is already running on ${selectedPort}. Stop that instance before changing host mode or clearing its cache.`);
    if (!adbPath) throw new Error(`Metro is already running on ${selectedPort}; adb is unavailable for its connection guard.`);
    console.log(`[expo-start] Reusing this project's Metro on ${selectedPort}; maintaining USB ports ${selectedPort} and ${API_PORT}. Keep this terminal open.`);
    const stop = keepReverseAlive({ adbPath, listDevices: () => getConnectedAndroidDevices(adbPath), ports: [...new Set([selectedPort, API_PORT])], unref: false });
    if (hasFlag('--android')) openExistingAndroid(adbPath, androidDevices, metro.hostUri);
    process.once('SIGINT', () => { stop(); process.exit(0); });
    process.once('SIGTERM', () => { stop(); process.exit(0); });
    return;
  }

  if (!hasFlag('--go', '--dev-client')) {
    // Native dependencies require the custom development client by default.
    expoArgs.push(hasDevClientInstalled && useDevClientByEnv ? '--dev-client' : '--go');
  }

  if (!hasFlag('--clear', '-c')) {
    expoArgs.push('--clear');
  }

  const usingAdbReverse = shouldTryReverse && reversePortForDevices(adbPath, androidDevices, selectedPort);

  // The development bundle derives the API host from Metro. When Metro advertises 127.0.0.1
  // over USB, forward the backend port too so the phone reaches the host machine's API.
  if (usingAdbReverse && API_PORT !== selectedPort) {
    reversePortForDevices(adbPath, androidDevices, API_PORT);
  }

  // The reverse rules above disappear whenever the phone's USB connection resets, which
  // leaves a still-running Metro unreachable ("Unable to load script"). Keep restoring them
  // for as long as this launcher lives.
  let stopReverse = () => {};
  if (shouldMaintainReverse) {
    stopReverse = keepReverseAlive({
      adbPath,
      listDevices: () => getConnectedAndroidDevices(adbPath),
      ports: API_PORT !== selectedPort ? [selectedPort, API_PORT] : [selectedPort],
    });
  }

  if (!explicitHostMode) {
    // `--localhost` binds Metro to IPv6 (::1) on current Node/Windows versions, while ADB's
    // tcp reverse connects to IPv4 localhost. Bind broadly and advertise 127.0.0.1 instead.
    expoArgs.push('--lan');
  }

  if (!mode.tunnel) {
    const packagerAddress = mode.usb ? '127.0.0.1' : getLanAddress();
    if (packagerAddress && !env.REACT_NATIVE_PACKAGER_HOSTNAME) {
      env.REACT_NATIVE_PACKAGER_HOSTNAME = packagerAddress;
      console.log(`[expo-start] Packager host set to ${packagerAddress}.`);
    }
  }

  if (!hasPortFlag()) {
    expoArgs.push('--port', String(selectedPort));
    console.log(`[expo-start] Using port ${selectedPort}.`);
  }

  expoArgs.push(...expoUserArgs);

  const child = spawn(process.execPath, expoArgs, {
    cwd: PROJECT_ROOT,
    env: {
      ...env,
      EXPO_NO_DOTENV: env.EXPO_NO_DOTENV || '0',
    },
    stdio: 'inherit',
  });

  if (shouldOpenAndroidDirectly) {
    // Expo's Windows Android opener can fail with AggregateError/EACCES even
    // when the emulator and Expo Go are healthy. Open the Expo Go deep link
    // through the already-resolved adb binary instead.
    setTimeout(() => {
      const devices = getConnectedAndroidDevices(adbPath);
      if (!adbPath || devices.length === 0) {
        console.warn('[expo-start] No Android emulator found to open Expo Go.');
        return;
      }

      const targetDevice = devices.find((serial) => !serial.startsWith('emulator-')) || devices[0];

      const result = spawnSync(adbPath, [
        '-s',
        targetDevice,
        'shell',
        'am',
        'start',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        `exp://127.0.0.1:${selectedPort}`,
      ], { encoding: 'utf8', timeout: 5000 });

      if (result.status === 0) {
        console.log(`[expo-start] Opened Expo Go on ${targetDevice}.`);
      } else {
        const message = (result.stderr || result.stdout || '').trim();
        console.warn(`[expo-start] Could not open Expo Go${message ? `: ${message}` : '.'}`);
      }
    }, 2500);
  }

  child.on('exit', (code, signal) => {
    stopReverse();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

if (require.main === module) run().catch((error) => {
  console.error(`[expo-start] ${error.message}`);
  process.exit(1);
});
module.exports = { connectionMode, getAdbCandidates, getConnectedAndroidDevices, inspectMetro, openExistingAndroid };
