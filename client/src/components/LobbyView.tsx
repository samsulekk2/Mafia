import { motion } from 'framer-motion';
import { getSocket } from '../lib/socket';
import { AdminPanel } from './AdminPanel';
import { PlayerList } from './PlayerList';
import { RoomInvite } from './RoomInvite';
import type { GameStatePublic } from '@shared/types';

interface Props {
  state: GameStatePublic;
  playerId: string;
  isAdmin: boolean;
}

export function LobbyView({ state, playerId, isAdmin }: Props) {
  const socket = getSocket();
  const me = state.players.find((p) => p.id === playerId);
  const activePlayers = state.players;
  const allReady = activePlayers.length >= 4 && activePlayers.every((p) => p.ready);
  const notReadyCount = activePlayers.filter((p) => !p.ready).length;

  const toggleReady = () => {
    if (!me) return;
    socket.emit('player_ready', { ready: !me.ready });
  };

  const startGame = () => {
    if (!isAdmin || !allReady) return;
    socket.emit('admin_start_game', {});
  };

  const roleItems = [
    { label: `${state.roleConfig.mafia} Mafia`, cls: 'dark:bg-red-900/30 bg-red-50 dark:text-red-400 text-red-600 dark:border-red-900/50 border-red-200' },
    { label: `${state.roleConfig.doctor} Doctor`, cls: 'dark:bg-green-900/30 bg-green-50 dark:text-green-400 text-green-600 dark:border-green-900/50 border-green-200' },
    { label: `${state.roleConfig.detective} Detective`, cls: 'dark:bg-blue-900/30 bg-blue-50 dark:text-blue-400 text-blue-600 dark:border-blue-900/50 border-blue-200' },
    {
      label: `${Math.max(0, activePlayers.length - state.roleConfig.mafia - state.roleConfig.doctor - state.roleConfig.detective)} Civilian`,
      cls: 'dark:bg-white/5 bg-gray-100 dark:text-white/50 text-gray-600 dark:border-white/10 border-gray-200',
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-2"
      >
        <h1 className="font-display text-3xl text-mafia-accent font-bold">Lobby</h1>
        <p className="dark:text-white/40 text-gray-500 text-sm mt-0.5">
          Room · <span className="font-semibold">{state.roomId}</span>
        </p>
      </motion.header>

      {/* Role summary pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="flex items-center justify-center flex-wrap gap-2"
      >
        {roleItems.map((item) => (
          <span key={item.label} className={`text-xs font-semibold px-3 py-1 rounded-full border ${item.cls}`}>
            {item.label}
          </span>
        ))}
      </motion.div>

      {/* Admin panel */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <AdminPanel state={state} />
        </motion.div>
      )}

      {/* Room invite */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }}>
        <RoomInvite roomId={state.roomId} />
      </motion.div>

      {/* Players */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <p className="text-xs font-semibold uppercase tracking-widest dark:text-white/40 text-gray-500 mb-3">
          Players ({activePlayers.length})
        </p>
        <PlayerList state={state} currentPlayerId={playerId} />
      </motion.section>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="flex gap-3"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={toggleReady}
          className={`flex-1 h-14 rounded-2xl font-semibold text-base transition-all ${
            me?.ready
              ? 'dark:bg-mafia-gold/15 bg-yellow-50 border-2 border-mafia-gold dark:text-mafia-gold text-yellow-700'
              : 'bg-mafia-accent hover:bg-red-700 text-white'
          }`}
        >
          {me?.ready ? '✓ Ready' : 'Ready up'}
        </motion.button>

        {isAdmin && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startGame}
            disabled={!allReady}
            className={`flex-1 h-14 rounded-2xl font-semibold text-base transition-all ${
              allReady
                ? 'bg-mafia-gold hover:bg-yellow-500 text-white shadow-lg shadow-mafia-gold/20'
                : 'dark:bg-white/5 bg-gray-200 dark:text-white/20 text-gray-400 cursor-not-allowed'
            }`}
          >
            {allReady ? '🎮 Start Game' : 'Waiting…'}
          </motion.button>
        )}
      </motion.div>

      {/* Status hint */}
      {!allReady && activePlayers.length > 0 && (
        <p className="text-center text-xs dark:text-white/30 text-gray-400">
          {activePlayers.length < 4
            ? `Need ${4 - activePlayers.length} more player${4 - activePlayers.length !== 1 ? 's' : ''} to start`
            : `${notReadyCount} player${notReadyCount !== 1 ? 's' : ''} not ready yet`}
        </p>
      )}
    </div>
  );
}
