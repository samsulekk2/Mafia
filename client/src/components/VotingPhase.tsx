import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '../lib/socket';
import type { GameStatePublic, VotingResult } from '@shared/types';

interface Props {
  state: GameStatePublic;
  playerId: string;
  lastResult: VotingResult | null;
}

export function VotingPhase({ state, playerId, lastResult }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const socket = getSocket();

  const me = state.players.find((p) => p.id === playerId);
  const canVote = me?.status === 'alive';
  const alivePlayers = state.players.filter((p) => p.status === 'alive');
  // Self excluded from selection — you cannot vote for yourself
  const votingTargets = alivePlayers.filter((p) => p.id !== playerId);
  const votedPlayerIds = state.votedPlayerIds ?? [];
  const allVoted = votedPlayerIds.length === alivePlayers.length && alivePlayers.length > 0;

  const submitVote = () => {
    if (!selected) return;
    socket.emit('vote_player', { targetId: selected }, (res) => {
      if (res?.ok) setVoted(true);
    });
  };

  // Show result screen briefly after phase ends
  if (state.phase !== 'VOTING' && lastResult) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center space-y-4">
        <h2 className="font-display text-2xl text-mafia-accent">Vote Result</h2>
        {lastResult.eliminatedUsername ? (
          <p className="dark:text-white text-gray-900">
            <span className="font-bold text-mafia-accent">{lastResult.eliminatedUsername}</span> was eliminated
            {lastResult.tie && (
              <span className="ml-2 text-xs dark:text-mafia-muted text-gray-500">(tie — random pick)</span>
            )}
          </p>
        ) : (
          <p className="dark:text-mafia-muted text-gray-600">No elimination this round</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      <header className="text-center">
        <h2 className="font-display text-3xl text-orange-400">Voting</h2>
        <p className="dark:text-mafia-muted text-gray-500 text-sm mt-1">Vote to eliminate a suspect</p>
      </header>

      {/* Dead player notice */}
      {!canVote && (
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-100 text-center dark:border border-white/10 border-gray-200">
          <p className="dark:text-mafia-muted text-gray-500 text-sm">You are dead — you cannot vote</p>
        </div>
      )}

      {/* Target selection */}
      {canVote && !voted && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest dark:text-mafia-muted text-gray-500 text-center">
            Select a player to eliminate
          </p>
          <div className="grid grid-cols-2 gap-2">
            {votingTargets.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(p.id)}
                className={`p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  selected === p.id
                    ? 'border-orange-400 bg-orange-400/20 dark:text-white text-gray-900'
                    : 'dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white dark:text-white text-gray-900 dark:hover:border-orange-400/40 hover:border-orange-300'
                }`}
              >
                {p.username}
                {p.id === playerId && (
                  <span className="ml-1 text-xs text-orange-400">(you)</span>
                )}
              </motion.button>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!selected}
            onClick={submitVote}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white transition-colors text-base"
          >
            Cast Vote
          </motion.button>
        </div>
      )}

      {/* Already voted confirmation */}
      {canVote && voted && (
        <div className="p-4 rounded-xl dark:bg-green-900/20 bg-green-50 dark:border border-green-500/30 border-green-200 text-center">
          <p className="dark:text-green-400 text-green-600 font-medium">✓ Vote cast — waiting for others</p>
          <p className="text-xs dark:text-mafia-muted text-gray-500 mt-1">Votes are hidden until all players finish</p>
        </div>
      )}

      {/* ── Real-time live voting panel ── visible to EVERYONE */}
      <div className="dark:bg-white/5 bg-gray-50 rounded-xl dark:border border-white/10 border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 dark:border-b border-white/10 border-b border-gray-200">
          <h3 className="text-sm font-semibold dark:text-white text-gray-900">Live Voting Panel</h3>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              allVoted
                ? 'bg-green-500/20 text-green-400'
                : 'dark:bg-white/10 bg-gray-200 dark:text-mafia-muted text-gray-600'
            }`}
          >
            {votedPlayerIds.length} / {alivePlayers.length} voted
          </span>
        </div>

        <div className="divide-y dark:divide-white/5 divide-gray-100">
          {alivePlayers.map((p) => {
            const hasVoted = votedPlayerIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 transition-colors duration-300 ${
                  hasVoted ? 'dark:bg-green-900/10 bg-green-50' : ''
                }`}
              >
                <span className={`text-sm font-medium ${
                  hasVoted ? 'dark:text-white text-gray-900' : 'dark:text-mafia-muted text-gray-500'
                }`}>
                  {p.username}
                  {p.id === playerId && (
                    <span className="ml-1.5 text-xs text-orange-400">(you)</span>
                  )}
                </span>
                {hasVoted ? (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="text-sm font-bold text-green-400"
                  >
                    ✓ Voted
                  </motion.span>
                ) : (
                  <span className="text-xs dark:text-mafia-muted text-gray-400">waiting…</span>
                )}
              </div>
            );
          })}
        </div>

        {allVoted && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 text-center dark:bg-green-900/10 bg-green-50 dark:border-t border-white/10 border-t border-green-100"
          >
            <p className="text-green-400 text-sm font-semibold">
              All votes in — results coming…
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
