import { clearSession } from './session';
import { disconnectSocket, getSocket } from './socket';
import { useGameStore } from '../store/gameStore';

export function logout(): void {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit('logout', {}, () => {
      disconnectSocket();
    });
  } else {
    disconnectSocket();
  }
  clearSession();
  useGameStore.getState().reset();
}
