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
  isSpectator: boolean;
}

export function LobbyView({ state, playerId, isAdmin, isSpectator }: Props) {
  const socket = getSocket();
  const me = state.players.find((p) => p.id === playerId);
  const activePlayers = state.players.filter((p) => !p.isSpectator);
  const allReady = activePlayers.length >= 4 && activePlayers.every((p) => p.ready);

  const toggleReady = () => {
    if (!me || isSpectator) return;
    socket.emit('player_ready', { ready: !me.ready });
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <header className="text-center">
        <h1 className="font-display text-3xl text-mafia-accent">Lobby</h1>
        <p className="text-mafia-muted text-sm mt-1">Room: {state.roomId}</p>
      </header>

      {isAdmin && <AdminPanel state={state} canStart={allReady} />}

      <RoomInvite roomId={state.roomId} />

      <section>
        <h2 className="text-sm uppercase tracking-widest text-mafia-muted mb-3">Players</h2>
        <PlayerList state={state} currentPlayerId={playerId} />
      </section>

      {!isSpectator && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={toggleReady}
          className={`w-full py-4 rounded-xl font-medium text-lg ${
            me?.ready
              ? 'bg-mafia-gold/20 border border-mafia-gold text-mafia-gold'
              : 'bg-mafia-accent hover:bg-red-700'
          }`}
        >
          {me?.ready ? 'Ready ✓' : 'Ready up'}
        </motion.button>
      )}

      {isSpectator && (
        <p className="text-center text-mafia-muted text-sm">Spectating — no interaction allowed</p>
      )}

      <p className="text-center text-xs text-mafia-muted">
        Roles: {state.roleConfig.mafia} mafia · {state.roleConfig.doctor} doctor ·{' '}
        {state.roleConfig.detective} detective ·{' '}
        {Math.max(
          0,
          activePlayers.length -
            state.roleConfig.mafia -
            state.roleConfig.doctor -
            state.roleConfig.detective
        )}{' '}
        civilians
      </p>
    </div>
  );
}
