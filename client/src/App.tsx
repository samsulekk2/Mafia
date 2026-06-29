import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { connectSocket, getSocket } from './lib/socket';
import { useGameStore } from './store/gameStore';
import { useSocketConnection, useTimerSync, persistSession } from './hooks/useSocketConnection';
import { saveSession } from './lib/session';
import { useVoiceChat } from './hooks/useVoiceChat';
import { playAnnouncement, playDayStart, playGameEnd, playTimerTick } from './hooks/useGameAudio';
import { LoginPage } from './components/LoginPage';
import { LobbyView } from './components/LobbyView';
import { RoleReveal } from './components/RoleReveal';
import { NightPhase } from './components/NightPhase';
import { DayPhase } from './components/DayPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameEndScreen } from './components/GameEndScreen';
import { TimerDisplay } from './components/TimerDisplay';
import { getRoomIdFromUrl } from './lib/room';
import { logout } from './lib/logout';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const roomId = getRoomIdFromUrl();

  const username = useGameStore((s) => s.username);
  const playerId = useGameStore((s) => s.playerId);
  const isAdmin = useGameStore((s) => s.isAdmin);
  const isSpectator = useGameStore((s) => s.isSpectator);
  const connected = useGameStore((s) => s.connected);
  const reconnecting = useGameStore((s) => s.reconnecting);
  const error = useGameStore((s) => s.error);
  const gameState = useGameStore((s) => s.gameState);
  const myRole = useGameStore((s) => s.myRole);
  const mafiaPartners = useGameStore((s) => s.mafiaPartners);
  const timer = useGameStore((s) => s.timer);
  const lastDayResult = useGameStore((s) => s.lastDayResult);
  const lastVotingResult = useGameStore((s) => s.lastVotingResult);
  const gameWinner = useGameStore((s) => s.gameWinner);

  useSocketConnection();
  useTimerSync();
  useVoiceChat();

  useEffect(() => {
    const phase = gameState?.phase;
    if (phase === 'DAY') playDayStart();
    if (phase === 'VOTING') playAnnouncement();
    if (phase === 'ENDED' && gameWinner) playGameEnd();
  }, [gameState?.phase, gameWinner]);

  useEffect(() => {
    if (timer?.remainingSeconds === 10) playTimerTick();
  }, [timer?.remainingSeconds]);

  useEffect(() => {
    if (myRole && gameState?.phase === 'NIGHT' && gameState.round === 1) {
      setShowRole(true);
      const t = setTimeout(() => setShowRole(false), 5000);
      return () => clearTimeout(t);
    }
  }, [myRole, gameState?.phase, gameState?.round]);

  const handleLogin = (name: string, password: string) => {
    setLoading(true);
    useGameStore.getState().setError(null);

    connectSocket();
    const socket = getSocket();

    socket.emit('login_request', { username: name, password }, (loginRes) => {
      if (!loginRes?.ok) {
        useGameStore.getState().setError(loginRes?.error ?? 'Login failed');
        setLoading(false);
        return;
      }

      useGameStore.getState().setUsername(loginRes.username!);
      useGameStore.getState().setIsAdmin(Boolean(loginRes.isAdmin));

      socket.emit('join_room', { roomId }, (joinRes) => {
        setLoading(false);
        if (!joinRes?.ok) {
          useGameStore.getState().setError(joinRes?.error ?? 'Join failed');
          return;
        }
        useGameStore.getState().setPlayerId(joinRes.playerId!);
        useGameStore.getState().setGameState(joinRes.state!);
        saveSession({
          username: loginRes.username!,
          playerId: joinRes.playerId!,
          roomId: joinRes.roomId ?? roomId,
          isAdmin: Boolean(loginRes.isAdmin),
          isSpectator: false,
        });
      });
    });
  };

  const handleSpectator = () => {
    setLoading(true);
    useGameStore.getState().setError(null);
    connectSocket();
    const socket = getSocket();

    socket.emit(
      'join_room',
      { asSpectator: true, displayName: `Spectator-${Date.now() % 10000}`, roomId },
      (joinRes) => {
        setLoading(false);
        if (!joinRes?.ok) {
          useGameStore.getState().setError(joinRes?.error ?? 'Join failed');
          return;
        }
        useGameStore.getState().setUsername('Spectator');
        useGameStore.getState().setIsSpectator(true);
        useGameStore.getState().setPlayerId(joinRes.playerId!);
        useGameStore.getState().setGameState(joinRes.state!);
        saveSession({
          username: 'Spectator',
          playerId: joinRes.playerId!,
          roomId: joinRes.roomId ?? roomId,
          isAdmin: false,
          isSpectator: true,
        });
      }
    );
  };

  useEffect(() => {
    if (username && playerId) persistSession();
  }, [username, playerId, gameState?.roomId]);

  if (!username || !playerId) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onSpectator={handleSpectator}
        loading={loading}
        error={error}
        roomId={roomId}
      />
    );
  }

  const phase = gameState?.phase ?? 'LOBBY';

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-10 bg-mafia-bg/90 backdrop-blur border-b border-white/5 px-4 py-2 flex justify-between items-center text-sm">
        <span className="text-mafia-muted">
          {connected ? '🟢' : reconnecting ? '🟡' : '🔴'} {username}
          {isAdmin && ' · Admin'}
          {reconnecting && !connected && (
            <span className="ml-2 text-yellow-400 text-xs">Reconnecting…</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {timer && phase !== 'LOBBY' && phase !== 'ENDED' && (
            <TimerDisplay seconds={timer.remainingSeconds} phase={timer.phase} />
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="text-mafia-muted hover:text-white text-xs px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase + (showRole ? '-role' : '')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {(phase === 'LOBBY' || phase === 'ENDED') && gameState && (
            <>
              {phase === 'ENDED' && gameWinner && <GameEndScreen winner={gameWinner} />}
              <LobbyView
                state={gameState}
                playerId={playerId}
                isAdmin={isAdmin}
                isSpectator={isSpectator}
              />
            </>
          )}

          {showRole && myRole && <RoleReveal role={myRole} mafiaPartners={mafiaPartners} />}

          {!showRole && phase === 'NIGHT' && gameState && (
            <NightPhase
              state={gameState}
              playerId={playerId}
              myRole={myRole}
              isSpectator={isSpectator}
            />
          )}

          {!showRole && phase === 'DAY' && lastDayResult && gameState && (
            <DayPhase result={lastDayResult} round={gameState.round} />
          )}

          {!showRole && (phase === 'VOTING' || lastVotingResult) && gameState && (
            <VotingPhase
              state={gameState}
              playerId={playerId}
              isSpectator={isSpectator}
              lastResult={lastVotingResult}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
