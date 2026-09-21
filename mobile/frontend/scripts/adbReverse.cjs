const { spawnSync } = require('node:child_process');

// `adb reverse` rules live on the phone's side of the USB connection, so they vanish
// whenever that connection resets (cable jiggle, USB mode change, screen-off, adb
// restart). Metro keeps running, but the phone can no longer reach it and the dev
// build dies with "Unable to load script". These helpers put the rules back.

const getReversedPorts = (adbPath, serial) => {
  const result = spawnSync(adbPath, ['-s', serial, 'reverse', '--list'], { encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0) return new Set();
  // Lines look like "UsbFfs tcp:8081 tcp:8081".
  return new Set([...result.stdout.matchAll(/tcp:(\d+)\s+tcp:\1\b/g)].map((match) => Number(match[1])));
};

// Adds whichever of `ports` is missing on the device and returns the ports it restored.
const restoreMissingReverse = (adbPath, serial, ports) => {
  const present = getReversedPorts(adbPath, serial);
  return ports.filter(
    (port) =>
      !present.has(port) &&
      spawnSync(adbPath, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], { timeout: 5000 }).status === 0
  );
};

// Re-checks every connected device on a timer. Also covers the adb server itself being
// killed: listing devices restarts it, and the phone's rules are restored once it is back.
const keepReverseAlive = ({ adbPath, listDevices, ports, intervalMs = 4000, log = console.log }) => {
  const timer = setInterval(() => {
    for (const serial of listDevices()) {
      const restored = restoreMissingReverse(adbPath, serial, ports);
      if (restored.length > 0) {
        log(`[expo-start] ADB reverse had been dropped for ${serial}; restored port ${restored.join(', ')}.`);
      }
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
};

module.exports = { getReversedPorts, keepReverseAlive, restoreMissingReverse };
