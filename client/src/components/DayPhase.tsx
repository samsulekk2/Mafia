import type { DayResultPublic } from '@shared/types';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../lib/socket';

interface Props {
  result: DayResultPublic;
  round: number;
}

function labelResult(value: string) {
  return value.replace(/_/g, ' ');
}

export function DayPhase({ result, round }: Props) {
  const detectiveDayReveal = useGameStore((s) => s.detectiveDayReveal);
  const myRole = useGameStore((s) => s.myRole);
  const playerId = useGameStore((s) => s.playerId);
  const gameState = useGameStore((s) => s.gameState);
  const skipDiscussionVotes = gameState?.skipDiscussionVotes ?? [];

  const hasVotedToSkip = playerId ? skipDiscussionVotes.includes(playerId) : false;
  const alivePlayers = gameState?.players.filter(p => p.status === 'alive' && !p.isSpectator) ?? [];
  const allVoted = skipDiscussionVotes.length === alivePlayers.length;

  const handleSkipVote = () => {
    if (!playerId) return;
    getSocket().emit('toggle_skip_discussion', (res: { ok: boolean }) => {
      if (!res.ok) console.error('Failed to toggle skip vote');
    });
  };

  const detectiveLabel =
    myRole === 'detective' && detectiveDayReveal && detectiveDayReveal.detectiveResult !== 'none'
      ? `${labelResult(detectiveDayReveal.detectiveResult)} (${detectiveDayReveal.detectiveTargetName})`
      : result.detectiveActed
        ? 'investigation completed'
        : 'none';

  const canVote = playerId && gameState?.players.find(p => p.id === playerId)?.status === 'alive';

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <header className="text-center">
        <h2 className="font-display text-3xl text-yellow-400">Day {round}</h2>
        <p className="text-mafia-muted text-sm mt-2">The sun rises. Here is what happened…</p>
      </header>

      <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/10">
        <Row label="Mafia kill" value={labelResult(result.mafiaResult)} />
        <Row label="Doctor save" value={labelResult(result.doctorResult)} />
        <Row label="Detective" value={detectiveLabel} />
        <div className="pt-2 border-t border-white/10">
          {result.deathResult ? (
            <p className="text-mafia-accent font-medium text-center text-lg">
              ☠ {result.deathResult.username} was killed last night
            </p>
          ) : (
            <p className="text-green-400 font-medium text-center">No one died last night</p>
          )}
        </div>
      </div>

      {myRole === 'detective' && detectiveDayReveal && (
        <p className="text-center text-xs text-blue-400/80">
          Your private investigation: {detectiveDayReveal.detectiveTargetName} is{' '}
          {detectiveDayReveal.detectiveResult === 'correct' ? 'Mafia' : 'not Mafia'}
        </p>
      )}

      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-medium text-mafia-muted mb-3">Skip Discussion Vote</h3>
        <p className="text-xs text-mafia-muted mb-3">
          {skipDiscussionVotes.length} / {alivePlayers.length} players voted to skip discussion
        </p>
        {canVote && (
          <button
            onClick={handleSkipVote}
            disabled={allVoted}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              hasVotedToSkip
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-mafia-primary hover:bg-mafia-primary/90 text-white'
            } ${allVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {hasVotedToSkip ? 'Vote to Skip ✓' : 'Vote to Skip Discussion'}
          </button>
        )}
        {allVoted && (
          <p className="text-center text-green-400 text-sm mt-2">All players voted - skipping to voting!</p>
        )}
      </div>

      <p className="text-center text-mafia-muted text-sm">Discuss before voting begins…</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-mafia-muted">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}
