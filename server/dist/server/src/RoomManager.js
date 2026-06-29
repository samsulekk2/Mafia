import { GameEngine } from './GameEngine.js';
const rooms = new Map();
export function getOrCreateRoom(roomId, onPhaseChange) {
    let room = rooms.get(roomId);
    if (!room) {
        room = new GameEngine(roomId, onPhaseChange);
        rooms.set(roomId, room);
    }
    else if (onPhaseChange) {
        room.setPhaseChangeCallback(onPhaseChange);
    }
    return room;
}
export function getRoom(roomId) {
    return rooms.get(roomId);
}
export function deleteRoom(roomId) {
    const room = rooms.get(roomId);
    if (room) {
        room.clearTimer();
        rooms.delete(roomId);
    }
}
