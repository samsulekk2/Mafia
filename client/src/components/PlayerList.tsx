import type { GameStatePublic } from '@shared/types';

interface Props {
  state: GameStatePublic;
  currentPlayerId: string | null;
}

export function PlayerList({ state, currentPlayerId }: Props) {
  return (
    <ul className="space-y-2">
      {state.players.map((p) => (
        <li
          key={p.id}
          className={`flex items-center justify-between p-3 rounded-lg border ${
            p.id === currentPlayerId ? 'border-mafia-gold/50 bg-mafia-gold/5' : 'border-white/5 bg-white/5'
          } ${p.status === 'dead' ? 'opacity-40 line-through' : ''}`}
        >
          <span className="font-medium">
            {p.username}
            {p.id === currentPlayerId && <span className="ml-2 text-xs text-mafia-gold">(you)</span>}
          </span>
          <span className="text-xs text-mafia-muted">
            {p.isSpectator ? '👁 spectator' : p.ready ? '✓ ready' : p.status === 'dead' ? '💀 dead' : '○ waiting'}
          </span>
        </li>
      ))}
    </ul>
  );
}
