import { ALLOWED_USERS } from '../../shared/types.js';
let credentials = null;
function parseCredentials() {
    const raw = process.env.USER_CREDENTIALS?.trim();
    if (!raw) {
        throw new Error('USER_CREDENTIALS env var is required (JSON map of username → password)');
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error('USER_CREDENTIALS must be valid JSON, e.g. {"Shindy":"pass1","Ali":"pass2"}');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('USER_CREDENTIALS must be a JSON object');
    }
    const map = new Map();
    for (const [key, value] of Object.entries(parsed)) {
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
export function getCredentials() {
    if (!credentials) {
        credentials = parseCredentials();
    }
    return credentials;
}
export function verifyPassword(username, password) {
    if (!ALLOWED_USERS.includes(username))
        return false;
    return getCredentials().get(username) === password;
}
