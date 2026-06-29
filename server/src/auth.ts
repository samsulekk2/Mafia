import { ALLOWED_USERS, type Username } from '../../shared/types.js';

let credentials: Map<string, string> | null = null;

function parseCredentials(): Map<string, string> {
  const raw = process.env.USER_CREDENTIALS?.trim();
  if (!raw) {
    throw new Error('USER_CREDENTIALS env var is required (JSON map of username → password)');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('USER_CREDENTIALS must be valid JSON, e.g. {"Shindy":"pass1","Ali":"pass2"}');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('USER_CREDENTIALS must be a JSON object');
  }

  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string' || !value) {
      throw new Error(`USER_CREDENTIALS: password for "${key}" must be a non-empty string`);
    }
    map.set(key, value);
  }

  for (const user of ALLOWED_USERS) {
    if (!map.has(user)) {
      throw new Error(`USER_CREDENTIALS missing password for whitelisted user: ${user}`);
    }
  }

  return map;
}

export function getCredentials(): Map<string, string> {
  if (!credentials) {
    credentials = parseCredentials();
  }
  return credentials;
}

export function verifyPassword(username: string, password: string): username is Username {
  if (!(ALLOWED_USERS as readonly string[]).includes(username)) return false;
  return getCredentials().get(username) === password;
}
