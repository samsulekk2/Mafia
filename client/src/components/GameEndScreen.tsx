import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Role } from '@shared/types';

interface Props {
  winner: 'mafia' | 'civilians';
}

const ROLE_STYLE: Record<Role, { label: string; color: string; bg: string }> = {
  mafia:     { label: 'Mafia',      color: 'text-red-400',    bg: 'dark:bg-red-900/20 bg-red-50 dark:border-red-500/30 border-red-200' },
  doctor:    { label: 'Doctor',     color: 'text-green-400',  bg: 'dark:bg-green-900/20 bg-green-50 dark:border-green-500/30 border-green-200' },
  detective: { label: 'Detective',  color: 'text-blue-400',   bg: 'dark:bg-blue-900/20 bg-blue-50 dark:border-blue-500/30 border-blue-200' },
  civilian:  { label: 'Civilian',   color: 'dark:text-mafia-muted text-gray-500', bg: 'dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200' },
};

export function GameEndScreen({ winner }: Props) {
  const mafiaWon = winner === 'mafia';
  const gameState = useGameStore((s) => s.gameState);
  const revealedRoles = gameState?.revealedRoles ?? [];

  const mafiaMembers = revealedRoles.filter((r) => r.role === 'mafia');
  const others = revealedRoles.filter((r) => r.role !== 'mafia');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md mx-auto p-6 space-y-6"
    >
      {/* Winner banner */}
      <div className={`rounded-2xl p-6 text-center border-2 ${
        mafiaWon
          ? 'dark:bg-red-900/20 bg-red-50 border-red-500/50'
          : 'dark:bg-green-900/20 bg-green-50 border-green-500/50'
      }`}>
        <p className="text-xs uppercase tracking-widest dark:text-mafia-muted text-gray-500 mb-2">Game Over</p>
        <h2 className={`font-display text-4xl font-bold ${mafiaWon ? 'text-red-400' : 'text-green-400'}`}>
          {mafiaWon ? 'Mafia Wins! 🔴' : 'Civilians Win! 🟢'}
        </h2>
      </div>

      {/* Mafia members — always shown prominently */}
      {mafiaMembers.length > 0 && (
        <div className="rounded-xl dark:bg-red-900/20 bg-red-50 border dark:border-red-500/30 border-red-200 overflow-hidden">
          <div className="px-4 py-3 dark:bg-red-900/30 bg-red-100 border-b dark:border-red-500/20 border-red-200">
            <p className="text-sm font-bold text-red-400 uppercase tracking-widest">
              🔴 The Mafia
            </p>
          </div>
          <div className="divide-y dark:divide-red-500/10 divide-red-100">
            {mafiaMembers.map((r) => (
              <div key={r.username} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg">🎭</span>
                <span className="font-semibold dark:text-white text-gray-900 text-base">{r.username}</span>
                <span className="ml-auto text-xs text-red-400 font-medium uppercase">Mafia</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All other roles */}
      {others.length > 0 && (
        <div className="dark:bg-white/5 bg-gray-50 rounded-xl dark:border border-white/10 border-gray-200 overflow-hidden">
          <div className="px-4 py-3 dark:border-b border-white/10 border-b border-gray-200">
            <p className="text-xs uppercase tracking-widest dark:text-mafia-muted text-gray-500 font-semibold">
              Full Role Reveal
            </p>
          </div>
          <div className="divide-y dark:divide-white/5 divide-gray-100">
            {others.map((r) => {
              const style = ROLE_STYLE[r.role];
              return (
                <div key={r.username} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium dark:text-white text-gray-900 text-sm">{r.username}</span>
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full border ${style.color} ${style.bg}`}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center dark:text-mafia-muted text-gray-500 text-xs">
        Admin can restart the lobby or end the session
      </p>
    </motion.div>
  );
}
