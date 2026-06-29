import { useState } from 'react';
import { getSocket } from '../lib/socket';
import type { GameStatePublic, VotingResult } from '@shared/types';

interface Props {
  state: GameStatePublic;
  playerId: string;
  isSpectator: boolean;
  lastResult: VotingResult | null;
}

export function VotingPhase({ state, playerId, isSpectator, lastResult }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const socket = getSocket();

  const me = state.players.find((p) => p.id === playerId);
  const canVote = !isSpectator && me?.status === 'alive';
  const targets = state.players.filter((p) => !p.isSpectator && p.status === 'alive');

  const submitVote = () => {
    if (!selected) return;
    socket.emit('vote_player', { targetId: selected }, (res) => {
      if (res?.ok) setVoted(true);
    });
  };

  if (state.phase !== 'VOTING' && lastResult) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center space-y-4">
        <h2 className="font-display text-2xl text-mafia-accent">Vote Result</h2>
        {lastResult.eliminatedUsername ? (
          <p>
            {lastResult.eliminatedUsername} was eliminated
            {lastResult.tie && ' (tie — random pick)'}
          </p>
        ) : (
          <p>No elimination this round</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <header className="text-center">
        <h2 className="font-display text-3xl text-orange-400">Voting</h2>
        <p className="text-mafia-muted text-sm mt-2">Vote to eliminate a suspect</p>
      </header>

      {isSpectator && <p className="text-center text-mafia-muted">Spectators cannot vote</p>}

      {!canVote && !isSpectator && (
        <p className="text-center text-mafia-muted">You are dead and cannot vote</p>
      )}

      {canVote && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {targets.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                disabled={voted}
                className={`p-3 rounded-lg border transition-all ${
                  selected === p.id
                    ? 'border-orange-400 bg-orange-400/20'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                } disabled:opacity-50`}
              >
                {p.username}
              </button>
            ))}
          </div>
          <button
            disabled={!selected || voted}
            onClick={submitVote}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 font-medium"
          >
            {voted ? 'Vote cast (hidden until end)' : 'Cast vote'}
          </button>
        </>
      )}

      {canVote && voted && (
        <p className="text-center text-xs text-mafia-muted">Votes are hidden until the phase ends</p>
      )}
    </div>
  );
}
