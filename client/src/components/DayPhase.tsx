import type { DayResultPublic } from '@shared/types';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../lib/socket';
import { motion } from 'framer-motion';

interface Props {
  result: DayResultPublic;
  round: number;
}

function labelResult(value: string) {
  return value.replace(/_/g, ' ');
}

export function DayPhase({ result, round }: Props) {
  const playerId = useGameStore((s) => s.playerId);
  const gameState = useGameStore((s) => s.gameState);
  const skipDiscussionVotes = gameState?.skipDiscussionVotes ?? [];

  const hasVotedToSkip = playerId ? skipDiscussionVotes.includes(playerId) : false;
  const alivePlayers = gameState?.players.filter((p) => p.status === 'alive') ?? [];
  const allVoted = skipDiscussionVotes.length === alivePlayers.length && alivePlayers.length > 0;
  const canVote = playerId && gameState?.players.find((p) => p.id === playerId)?.status === 'alive';

  const handleSkipVote = () => {
    if (!playerId) return;
    getSocket().emit('toggle_skip_discussion', (res: { ok: boolean }) => {
      if (!res.ok) console.error('Failed to toggle skip vote');
    });
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      <header className="text-center">
        <h2 className="font-display text-3xl text-yellow-400">Day {round}</h2>
        <p className="dark:text-mafia-muted text-gray-600 text-sm mt-2">
          The sun rises. Here is what happened…
        </p>
      </header>

      {/* Night results */}
      <div className="dark:bg-white/5 bg-gray-50 rounded-xl dark:border border-white/10 border-gray-200 overflow-hidden">
        <div className="px-4 py-3 dark:border-b border-white/10 border-b border-gray-200">
          <p className="text-xs uppercase tracking-widest dark:text-mafia-muted text-gray-500 font-semibold">
            Night Summary
          </p>
        </div>
        <div className="divide-y dark:divide-white/5 divide-gray-100">
          <Row label="Mafia kill" value={labelResult(result.mafiaResult)} />
          <div className="flex justify-between items-center px-4 py-3 text-sm">
            <span className="dark:text-mafia-muted text-gray-500">Doctor</span>
            <span className="capitalize dark:text-white text-gray-900">
              {result.doctorResult === 'success' ? 'saved correctly' : 'saved wrong'}
            </span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 text-sm">
            <span className="dark:text-mafia-muted text-gray-500">Detective</span>
            <span className={`font-medium ${
              result.detectiveResult === 'correct' ? 'text-green-400' : 'dark:text-mafia-muted text-gray-400'
            }`}>
              {result.detectiveResult === 'correct' ? 'Guessed correct ✓' : 'Guessed wrong ✗'}
            </span>
          </div>
        </div>
        <div className={`px-4 py-4 text-center border-t ${
          result.deathResult
            ? 'dark:border-red-500/20 border-red-200 dark:bg-red-900/10 bg-red-50'
            : 'dark:border-green-500/20 border-green-200 dark:bg-green-900/10 bg-green-50'
        } dark:border-t border-t`}>
          {result.deathResult ? (
            <p className="text-mafia-accent font-semibold text-lg">
              ☠ {result.deathResult.username} was killed last night
            </p>
          ) : (
            <p className="text-green-400 font-semibold">✓ No one died last night</p>
          )}
        </div>
      </div>

      {/* Skip to voting — prominent CTA */}
      {canVote && (
        <div className="space-y-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSkipVote}
            disabled={allVoted}
            className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
              hasVotedToSkip
                ? 'bg-mafia-gold/20 dark:border-2 border-2 border-mafia-gold text-mafia-gold'
                : 'bg-mafia-primary hover:bg-blue-600 text-white'
            } ${allVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {hasVotedToSkip ? '✓ Skip voted — click to undo' : '⏩ Vote to Skip Discussion'}
          </motion.button>
          <p className="text-center text-xs dark:text-mafia-muted text-gray-500">
            {skipDiscussionVotes.length} / {alivePlayers.length} players voted to skip
            {allVoted && <span className="ml-1 text-green-400 font-medium">— jumping to voting!</span>}
          </p>
        </div>
      )}

      {!canVote && (
        <p className="text-center dark:text-mafia-muted text-gray-500 text-sm">
          Discuss before voting begins…
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="dark:text-mafia-muted text-gray-500">{label}</span>
      <span className="capitalize dark:text-white text-gray-900">{value}</span>
    </div>
  );
}
