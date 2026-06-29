/**
 * Smoke-test credential login for all 7 whitelisted users.
 * Usage: npm run test:login   (server must be running on PORT from server/.env)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from '../node_modules/socket.io-client/build/esm/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv(filePath) {
  const env = {};
  try {
    const text = readFileSync(filePath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    /* missing file */
  }
  return env;
}

const serverEnv = loadEnv(resolve(root, 'server/.env'));
const PORT = serverEnv.PORT || '3001';
const SERVER_URL = `http://localhost:${PORT}`;
const credentials = JSON.parse(serverEnv.USER_CREDENTIALS || '{}');

const USERS = ['Shindy', 'Ali', 'Sair', 'Faizan', 'Faris', 'Ahmed', 'Barry'];

function loginUser(username, password) {
  return new Promise((resolvePromise, reject) => {
    const socket = io(SERVER_URL, { transports: ['websocket'], autoConnect: true });
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${username}: timeout`));
    }, 5000);

    socket.on('connect', () => {
      socket.emit('login_request', { username, password }, (res) => {
        clearTimeout(timeout);
        socket.disconnect();
        if (res?.ok) resolvePromise({ username, isAdmin: res.isAdmin });
        else reject(new Error(`${username}: ${res?.error ?? 'login failed'}`));
      });
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Cannot connect to ${SERVER_URL}: ${err.message}`));
    });
  });
}

async function main() {
  console.log(`Testing login against ${SERVER_URL}\n`);

  let passed = 0;
  for (const user of USERS) {
    const password = credentials[user];
    if (!password) {
      console.log(`  ✗ ${user} — no password in server/.env USER_CREDENTIALS`);
      continue;
    }
    try {
      const res = await loginUser(user, password);
      console.log(`  ✓ ${user}${res.isAdmin ? ' (admin)' : ''}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${err.message}`);
    }
  }

  // Wrong password should fail
  try {
    await loginUser('Shindy', 'wrong-password');
    console.log('  ✗ Shindy with wrong password — should have failed');
  } catch {
    console.log('  ✓ Wrong password correctly rejected');
    passed++;
  }

  console.log(`\n${passed}/${USERS.length + 1} checks passed`);
  process.exit(passed === USERS.length + 1 ? 0 : 1);
}

main();
