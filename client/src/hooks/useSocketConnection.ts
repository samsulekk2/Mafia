import { useEffect, useRef } from 'react';
import { connectSocket, getSocket } from '../lib/socket';
import { loadSession, saveSession, clearSession } from '../lib/session';
import { useGameStore } from '../store/gameStore';

export function useSocketConnection() {
  const bound = useRef(false);
  const reconnecting = useRef(false);

  useEffect(() => {
    if (bound.current) return;
    bound.current = true;

    const socket = connectSocket();
    const store = useGameStore.getState;

    function attemptReconnect() {
      const session = loadSession();
      if (!session || reconnecting.current) return;
      reconnecting.current = true;

      socket.emit('reconnect_session', session, (res) => {
        reconnecting.current = false;
        if (!res?.ok) {
          clearSession();
          return;
        }
        store().setUsername(session.username);
        store().setPlayerId(res.playerId!);
        store().setIsAdmin(Boolean(res.isAdmin));
        store().setIsSpectator(session.isSpectator);
        store().setGameState(res.state!);
        if (res.timer) store().setTimer(res.timer);
        if (res.winner) store().setGameWinner(res.winner);
      });
    }

    socket.on('connect', () => {
      store().setConnected(true);
      store().setReconnecting(false);
      const session = loadSession();
      if (session && !store().playerId) {
        attemptReconnect();
      } else if (session && store().playerId) {
        attemptReconnect();
      }
    });

    socket.on('disconnect', () => {
      store().setConnected(false);
      store().setReconnecting(true);
    });

    socket.io.on('reconnect', () => {
      attemptReconnect();
    });

    socket.on('game_state', (state) => store().setGameState(state));

    socket.on('roles_assigned', (payload) => store().setRoleAssignment(payload));

    socket.on('night_start', ({ timer }) => {
      store().setTimer(timer);
      store().setDetectiveInvestigation(null);
      store().setDetectiveDayReveal(null);
    });

    socket.on('day_result', (payload) => {
      store().setLastDayResult(payload);
      store().setTimer(payload.timer);
    });

    socket.on('detective_investigation_result', (result) => {
      store().setDetectiveInvestigation(result);
    });

    socket.on('detective_day_reveal', (result) => {
      store().setDetectiveDayReveal(result);
    });

    socket.on('voting_start', ({ timer }) => store().setTimer(timer));

    socket.on('voting_result', (result) => store().setLastVotingResult(result));

    socket.on('game_end', ({ winner }) => store().setGameWinner(winner));

    socket.on('voice_chat_status', ({ enabled }) => {
      const state = store().gameState;
      if (state) store().setGameState({ ...state, voiceChatEnabled: enabled });
    });

    socket.on('kicked', ({ reason }) => {
      store().setError(reason);
      clearSession();
      store().reset();
      getSocket().disconnect();
    });

    const session = loadSession();
    if (session) {
      store().setUsername(session.username);
      store().setPlayerId(session.playerId);
      store().setIsAdmin(session.isAdmin);
      store().setIsSpectator(session.isSpectator);
      if (socket.connected) attemptReconnect();
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.io.off('reconnect');
      socket.off('game_state');
      socket.off('roles_assigned');
      socket.off('night_start');
      socket.off('day_result');
      socket.off('detective_investigation_result');
      socket.off('detective_day_reveal');
      socket.off('voting_start');
      socket.off('voting_result');
      socket.off('game_end');
      socket.off('voice_chat_status');
      socket.off('kicked');
    };
  }, []);
}

export function persistSession(): void {
  const s = useGameStore.getState();
  if (!s.username || !s.playerId || !s.gameState?.roomId) return;
  saveSession({
    username: s.username,
    playerId: s.playerId,
    roomId: s.gameState.roomId,
    isAdmin: s.isAdmin,
    isSpectator: s.isSpectator,
  });
}

export function useTimerSync() {
  const timer = useGameStore((s) => s.timer);
  const setTimer = useGameStore((s) => s.setTimer);

  useEffect(() => {
    if (!timer?.endsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
      setTimer({ ...timer, remainingSeconds: remaining });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.endsAt, timer?.phase, setTimer]);
}
