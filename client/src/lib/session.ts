export interface SessionPayload {
  username: string;
  playerId: string;
  roomId: string;
  isAdmin: boolean;
  isSpectator: boolean;
}

const SESSION_KEY = 'mafia_session';

export function saveSession(session: SessionPayload): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

export function loadSession(): SessionPayload | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}
