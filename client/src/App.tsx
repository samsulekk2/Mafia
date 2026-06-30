import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { connectSocket, getSocket } from './lib/socket';
import { useGameStore } from './store/gameStore';
import { useSocketConnection, useTimerSync, persistSession } from './hooks/useSocketConnection';
import { saveSession, clearSession } from './lib/session';
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
  const sessionRestoring = useGameStore((s) => s.sessionRestoring);

  const getTotalSeconds = (phase: string): number => {
    const cfg = gameState?.gameConfig;
    if (cfg) {
      if (phase === 'night') return cfg.nightTime;
      if (phase === 'day') return cfg.dayTime;
      if (phase === 'voting') return cfg.votingTime;
    }
    if (phase === 'night') return 60;
    if (phase === 'day') return 240;
    if (phase === 'voting') return 240;
    return 60;
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

  if (sessionRestoring) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 dark:bg-mafia-bg bg-mafia-bg-light">
        <span className="text-5xl animate-pulse">🎭</span>
        <p className="dark:text-mafia-muted text-gray-500 text-sm">Restoring your session…</p>
        <button
          type="button"
          onClick={() => { clearSession(); useGameStore.getState().reset(); }}
          className="text-xs dark:text-mafia-muted text-gray-400 underline mt-2"
        >
          Sign in fresh instead
        </button>
      </div>
    );
  }

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
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom)] dark:bg-mafia-bg bg-mafia-bg-light dark:text-white text-gray-900">
      <div className="sticky top-0 z-20 dark:bg-mafia-bg/95 bg-white/95 backdrop-blur-md border-b dark:border-white/[0.06] border-gray-200/80 px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
            connected ? 'bg-green-400' : reconnecting ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="font-semibold text-sm dark:text-white text-gray-900 truncate">
            {username}
          </span>
          {isAdmin && (
            <span className="text-xs text-mafia-gold font-medium flex-shrink-0">Admin</span>
          )}
          {reconnecting && !connected && (
            <span className="text-yellow-400 text-xs animate-pulse flex-shrink-0">Reconnecting…</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
            className="w-9 h-9 rounded-xl dark:bg-white/[0.06] bg-gray-100 flex items-center justify-center text-base transition-all active:scale-90"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-9 h-9 rounded-xl dark:bg-white/[0.06] bg-gray-100 flex items-center justify-center dark:text-white/60 text-gray-500 transition-all active:scale-90"
            title="Log out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase + (showRole ? '-role' : '')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
