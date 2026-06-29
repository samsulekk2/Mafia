const DEFAULT_ROOM = 'main';

export function getRoomIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room')?.trim();
  if (!room) return DEFAULT_ROOM;
  return room.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 32) || DEFAULT_ROOM;
}

export function buildRoomInviteUrl(roomId: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', roomId);
  return url.toString();
}

export async function copyRoomLink(roomId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildRoomInviteUrl(roomId));
    return true;
  } catch {
    return false;
  }
}
