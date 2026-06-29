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
import { CircularTimer } from './components/CircularTimer';
import { getRoomIdFromUrl } from './lib/room';
import { logout } from './lib/logout';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function AppContent() {
  const [loading, setLoading] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const roomId = getRoomIdFromUrl();
  const { theme, toggleTheme } = useTheme();

  const username = useGameStore((s) => s.username);
  const playerId = useGameStore((s) => s.playerId);
  const isAdmin = useGameStore((s) => s.isAdmin);
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

  const getTotalSeconds = (phase: string): number => {
    switch (phase) {
      case 'night': return 60;
      case 'day': return 240;
      case 'voting': return 240;
      default: return 60;
    }
  };

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
        });
      });
    });
  };

  useEffect(() => {
    if (username && playerId) persistSession();
  }, [username, playerId, gameState?.roomId]);

  if (!username || !playerId) {
    return (
      <LoginPage
        onLogin={handleLogin}
        loading={loading}
        error={error}
        roomId={roomId}
      />
    );
  }

  const phase = gameState?.phase ?? 'LOBBY';

  return (
    <div className="min-h-screen pb-8 dark:bg-mafia-bg bg-mafia-bg-light dark:text-white text-gray-900">
      <div className="sticky top-0 z-10 dark:bg-mafia-bg/90 bg-white/90 backdrop-blur border-b dark:border-white/5 border-gray-200 px-4 py-2 flex justify-between items-center text-sm">
        <span className="dark:text-mafia-muted text-gray-600">
          {connected ? '🟢' : reconnecting ? '🟡' : '🔴'} {username}
          {isAdmin && ' · Admin'}
          {reconnecting && !connected && (
            <span className="ml-2 text-yellow-400 text-xs">Reconnecting…</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {timer && phase !== 'LOBBY' && phase !== 'ENDED' && (
            <CircularTimer 
              seconds={timer.remainingSeconds} 
              totalSeconds={getTotalSeconds(timer.phase)} 
              phase={timer.phase} 
            />
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="dark:text-mafia-muted text-gray-600 dark:hover:text-white hover:text-gray-900 text-xs px-2 py-1 rounded dark:border-white/10 border-gray-300 dark:hover:border-white/20 hover:border-gray-400 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="dark:text-mafia-muted text-gray-600 dark:hover:text-white hover:text-gray-900 text-xs px-2 py-1 rounded dark:border-white/10 border-gray-300 dark:hover:border-white/20 hover:border-gray-400 transition-colors"
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
              />
            </>
          )}

          {showRole && myRole && <RoleReveal role={myRole} mafiaPartners={mafiaPartners} />}

          {!showRole && phase === 'NIGHT' && gameState && (
            <NightPhase
              state={gameState}
              playerId={playerId}
              myRole={myRole}
            />
          )}

          {!showRole && phase === 'DAY' && lastDayResult && gameState && (
            <DayPhase result={lastDayResult} round={gameState.round} />
          )}

          {!showRole && (phase === 'VOTING' || lastVotingResult) && gameState && (
            <VotingPhase
              state={gameState}
              playerId={playerId}
              lastResult={lastVotingResult}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
