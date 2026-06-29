import { useState } from 'react';
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
  const targets = state.players.filter((p) => p.status === 'alive');
  const votedPlayerIds = state.votedPlayerIds ?? [];
  const alivePlayers = state.players.filter((p) => p.status === 'alive');
  const allVoted = votedPlayerIds.length === alivePlayers.length;

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
        <p className="dark:text-mafia-muted text-gray-600 text-sm mt-2">Vote to eliminate a suspect</p>
      </header>

      {!canVote && (
        <p className="text-center dark:text-mafia-muted text-gray-600">You are dead and cannot vote</p>
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
                    : 'dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 hover:dark:border-white/30 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                {p.username}
              </button>
            ))}
          </div>
          <button
            disabled={!selected || voted}
            onClick={submitVote}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 font-medium text-white"
          >
            {voted ? 'Vote cast (hidden until end)' : 'Cast vote'}
          </button>
        </>
      )}

      <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-4 dark:border border-white/10 border-gray-300">
        <h3 className="text-sm font-medium dark:text-mafia-muted text-gray-600 mb-3">Voting Progress</h3>
        <p className="text-xs dark:text-mafia-muted text-gray-600 mb-3">
          {votedPlayerIds.length} / {alivePlayers.length} players have voted
        </p>
        <div className="space-y-2">
          {alivePlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="dark:text-white text-gray-900">{p.username}</span>
              {votedPlayerIds.includes(p.id) ? (
                <span className="text-green-400">✓ Voted</span>
              ) : (
                <span className="dark:text-mafia-muted text-gray-600">Waiting...</span>
              )}
            </div>
          ))}
        </div>
        {allVoted && (
          <p className="text-center text-green-400 text-sm mt-3">All votes cast - calculating results...</p>
        )}
      </div>

      {canVote && voted && (
        <p className="text-center text-xs dark:text-mafia-muted text-gray-600">Votes are hidden until the phase ends</p>
      )}
    </div>
  );
}
