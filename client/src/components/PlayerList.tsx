import { motion } from 'framer-motion';
import type { GameStatePublic } from '@shared/types';

interface Props {
  state: GameStatePublic;
  currentPlayerId: string | null;
}

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-violet-500', 'bg-pink-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function PlayerList({ state, currentPlayerId }: Props) {
  return (
    <ul className="space-y-2">
      {state.players.map((p, i) => {
        const isMe = p.id === currentPlayerId;
        const isDead = p.status === 'dead';

        return (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              isMe
                ? 'dark:bg-yellow-900/10 bg-yellow-50 dark:border-yellow-700/30 border-yellow-300/60'
                : 'dark:bg-white/[0.03] bg-white dark:border-white/[0.06] border-gray-100'
            } ${isDead ? 'opacity-40' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold transition-all ${
                isDead ? 'bg-gray-500 grayscale' : getAvatarColor(p.username)
              }`}
            >
              {isDead ? '💀' : getInitials(p.username)}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold text-sm truncate ${
                  isDead
                    ? 'line-through dark:text-white/30 text-gray-400'
                    : 'dark:text-white text-gray-900'
                }`}
              >
                {p.username}
                {isMe && (
                  <span className="ml-1.5 text-xs text-mafia-gold font-normal">you</span>
                )}
              </p>
              {isDead && (
                <p className="text-xs dark:text-white/25 text-gray-400">eliminated</p>
              )}
            </div>

            {/* Status badge */}
            {!isDead && (
              <motion.span
                animate={{ opacity: p.ready ? 1 : 0.7 }}
                className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                  p.ready
                    ? 'dark:bg-green-900/40 bg-green-100 dark:text-green-400 text-green-600'
                    : 'dark:bg-white/5 bg-gray-100 dark:text-white/30 text-gray-500'
                }`}
              >
                {p.ready ? '✓ Ready' : 'Waiting'}
              </motion.span>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
