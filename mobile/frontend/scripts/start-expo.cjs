#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_PORT = Number(process.env.EXPO_START_PORT || 8081);
const API_PORT = Number(process.env.EXPO_API_PORT || 5000);
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
const useDevClientByEnv = process.env.EXPO_USE_DEV_CLIENT === '1';

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

const run = async () => {
  const expoArgs = [require.resolve('expo/bin/cli'), 'start'];
  const env = { ...process.env };
  const explicitHostMode = hasFlag('--lan', '--localhost', '--tunnel');
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
  const shouldTryReverse = selectedPort && !hasFlag('--lan', '--tunnel') && androidDevices.length > 0;
  const shouldOpenAndroidDirectly = hasFlag('--android') && !hasFlag('--dev-client') && !useDevClientByEnv;
  const expoUserArgs = shouldOpenAndroidDirectly ? userArgs.filter((arg) => arg !== '--android') : userArgs;

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

  if (!hasPortFlag() && !(await isPortFree(selectedPort))) {
    console.warn(
      `[expo-start] Port ${selectedPort} is already in use. Reuse the existing Metro instance on ${selectedPort}, or stop that process before starting another one.`
    );
  }

  if (!hasFlag('--go', '--dev-client')) {
    // Expo Go is the safe default for local Android preview. A dev client is
    // still supported explicitly with `--dev-client` or EXPO_USE_DEV_CLIENT=1.
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

  if (!explicitHostMode) {
    // `--localhost` binds Metro to IPv6 (::1) on current Node/Windows versions, while ADB's
    // tcp reverse connects to IPv4 localhost. Bind broadly and advertise 127.0.0.1 instead.
    expoArgs.push('--lan');
  }

  if (!hasFlag('--localhost', '--tunnel')) {
    const packagerAddress = usingAdbReverse ? '127.0.0.1' : getLanAddress();
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
    cwd: process.cwd(),
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
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

run().catch((error) => {
  console.error(`[expo-start] ${error.message}`);
  process.exit(1);
});
