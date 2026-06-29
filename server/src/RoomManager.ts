import { GameEngine } from './GameEngine.js';

const rooms = new Map<string, GameEngine>();

export function getOrCreateRoom(
  roomId: string,
  onPhaseChange?: () => void
): GameEngine {
  let room = rooms.get(roomId);
  if (!room) {
    room = new GameEngine(roomId, onPhaseChange);
    rooms.set(roomId, room);
  } else if (onPhaseChange) {
    room.setPhaseChangeCallback(onPhaseChange);
  }
  return room;
}

export function getRoom(roomId: string): GameEngine | undefined {
  return rooms.get(roomId);
}

export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.clearTimer();
    rooms.delete(roomId);
  }
}
