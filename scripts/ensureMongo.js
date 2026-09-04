const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = process.cwd();
const defaultMongoUri = 'mongodb://127.0.0.1:27017/kaamsaathi';
const mongoUri =
  readEnvValue(path.join(backendRoot, '.env.local'), 'MONGO_URI') ||
  readEnvValue(path.join(backendRoot, '.env'), 'MONGO_URI') ||
  process.env.MONGO_URI ||
  defaultMongoUri;

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const line = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) {
    return undefined;
  }

  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

function getLocalMongoEndpoint(uri) {
  try {
    const parsed = new URL(uri);
    const hostname = parsed.hostname;
    const port = Number(parsed.port || 27017);
    const isLocal = hostname === '127.0.0.1' || hostname === 'localhost';

    return isLocal ? { host: '127.0.0.1', port } : null;
  } catch {
    return { host: '127.0.0.1', port: 27017 };
  }
}

function canConnect({ host, port }) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForMongo(endpoint) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await canConnect(endpoint)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}

function findMongod() {
  if (process.env.MONGOD_BIN && fs.existsSync(process.env.MONGOD_BIN)) {
    return process.env.MONGOD_BIN;
  }

  const installRoot = 'C:\\Program Files\\MongoDB\\Server';
  if (process.platform === 'win32' && fs.existsSync(installRoot)) {
    const versions = fs
      .readdirSync(installRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    for (const version of versions) {
      const candidate = path.join(installRoot, version, 'bin', 'mongod.exe');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return 'mongod';
}

async function main() {
  const endpoint = getLocalMongoEndpoint(mongoUri);
  if (!endpoint) {
    return;
  }

  if (await canConnect(endpoint)) {
    return;
  }

  const dataDir = path.join(repoRoot, '.local-mongo', 'data');
  const logPath = path.join(repoRoot, '.local-mongo', 'mongod.log');
  fs.mkdirSync(dataDir, { recursive: true });

  const mongod = findMongod();
  const args = [
    '--dbpath',
    dataDir,
    '--bind_ip',
    endpoint.host,
    '--port',
    String(endpoint.port),
    '--logpath',
    logPath,
    '--logappend',
    '--wiredTigerCacheSizeGB',
    process.env.MONGO_CACHE_GB || '0.25',
    '--setParameter',
    'diagnosticDataCollectionEnabled=false',
  ];

  const child = spawn(mongod, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();

  if (!(await waitForMongo(endpoint))) {
    console.error(`MongoDB did not become ready at ${endpoint.host}:${endpoint.port}.`);
    console.error(`Check log: ${logPath}`);
    process.exit(1);
  }

  console.log(`MongoDB ready at ${endpoint.host}:${endpoint.port}`);
}

main().catch((error) => {
  console.error('Failed to ensure MongoDB is running:', error);
  process.exit(1);
});
