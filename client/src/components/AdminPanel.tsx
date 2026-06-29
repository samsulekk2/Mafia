import { useState } from 'react';
import { getSocket } from '../lib/socket';
import type { GameStatePublic } from '@shared/types';

interface Props {
  state: GameStatePublic;
  canStart: boolean;
}

export function AdminPanel({ state, canStart }: Props) {
  const [mafia, setMafia] = useState(state.roleConfig.mafia);
  const [doctor, setDoctor] = useState(state.roleConfig.doctor);
  const [detective, setDetective] = useState(state.roleConfig.detective);
  const [nightTime, setNightTime] = useState(state.gameConfig.nightTime);
  const [dayTime, setDayTime] = useState(state.gameConfig.dayTime);
  const [votingTime, setVotingTime] = useState(state.gameConfig.votingTime);
  const [revealRolesOnDeath, setRevealRolesOnDeath] = useState(state.gameConfig.revealRolesOnDeath);
  const socket = getSocket();

  const applyRoles = () => {
    socket.emit('admin_configure_roles', { mafia, doctor, detective });
  };

  const applyGameConfig = () => {
    socket.emit('admin_configure_game', {
      nightTime,
      dayTime,
      votingTime,
      voiceChatEnabled: state.voiceChatEnabled,
      revealRolesOnDeath,
    });
  };

  return (
    <div className="dark:bg-mafia-accent/10 bg-red-50 dark:border border-mafia-accent/30 border-red-200 rounded-xl p-4 space-y-4">
      <h3 className="font-display text-mafia-gold text-lg">Admin Controls</h3>

      <div>
        <p className="text-xs dark:text-mafia-muted text-gray-600 mb-2">Role Configuration</p>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm dark:text-white text-gray-900">
            Mafia
            <input
              type="number"
              min={0}
              value={mafia}
              onChange={(e) => setMafia(+e.target.value)}
              className="mt-1 w-full dark:bg-black/30 bg-gray-100 rounded px-2 py-1 dark:border border-white/10 border-gray-300"
            />
          </label>
          <label className="text-sm dark:text-white text-gray-900">
            Doctor
            <input
              type="number"
              min={0}
              value={doctor}
              onChange={(e) => setDoctor(+e.target.value)}
              className="mt-1 w-full dark:bg-black/30 bg-gray-100 rounded px-2 py-1 dark:border border-white/10 border-gray-300"
            />
          </label>
          <label className="text-sm dark:text-white text-gray-900">
            Detective
            <input
              type="number"
              min={0}
              value={detective}
              onChange={(e) => setDetective(+e.target.value)}
              className="mt-1 w-full dark:bg-black/30 bg-gray-100 rounded px-2 py-1 dark:border border-white/10 border-gray-300"
            />
          </label>
        </div>
        <button onClick={applyRoles} className="mt-2 text-sm px-3 py-1 rounded dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300">
          Apply roles
        </button>
      </div>

      <div>
        <p className="text-xs dark:text-mafia-muted text-gray-600 mb-2">Timer Configuration (seconds)</p>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm dark:text-white text-gray-900">
            Night
            <input
              type="number"
              min={10}
              value={nightTime}
              onChange={(e) => setNightTime(+e.target.value)}
              className="mt-1 w-full dark:bg-black/30 bg-gray-100 rounded px-2 py-1 dark:border border-white/10 border-gray-300"
            />
          </label>
          <label className="text-sm dark:text-white text-gray-900">
            Day
            <input
              type="number"
              min={10}
              value={dayTime}
              onChange={(e) => setDayTime(+e.target.value)}
              className="mt-1 w-full dark:bg-black/30 bg-gray-100 rounded px-2 py-1 dark:border border-white/10 border-gray-300"
            />
          </label>
          <label className="text-sm dark:text-white text-gray-900">
            Voting
            <input
              type="number"
              min={10}
              value={votingTime}
              onChange={(e) => setVotingTime(+e.target.value)}
              className="mt-1 w-full dark:bg-black/30 bg-gray-100 rounded px-2 py-1 dark:border border-white/10 border-gray-300"
            />
          </label>
        </div>
        <button onClick={applyGameConfig} className="mt-2 text-sm px-3 py-1 rounded dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300">
          Apply timers
        </button>
      </div>

      <div>
        <p className="text-xs dark:text-mafia-muted text-gray-600 mb-2">Game Settings</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm dark:text-white text-gray-900">
            <input
              type="checkbox"
              checked={revealRolesOnDeath}
              onChange={(e) => setRevealRolesOnDeath(e.target.checked)}
              className="rounded"
            />
            Reveal roles on death
          </label>
        </div>
        <button onClick={applyGameConfig} className="mt-2 text-sm px-3 py-1 rounded dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300">
          Apply settings
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => socket.emit('admin_toggle_voice', { enabled: !state.voiceChatEnabled })}
          className="text-sm px-3 py-2 rounded dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300"
        >
          Voice: {state.voiceChatEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          disabled={!canStart}
          onClick={() => socket.emit('admin_start_game', {})}
          className="text-sm px-4 py-2 rounded bg-mafia-accent hover:bg-red-700 disabled:opacity-40 font-medium text-white"
        >
          Start game
        </button>
        <button
          onClick={() => socket.emit('admin_restart_session', {})}
          className="text-sm px-3 py-2 rounded dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300"
        >
          Restart lobby
        </button>
        <button
          onClick={() => socket.emit('admin_end_game', {})}
          className="text-sm px-3 py-2 rounded dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300"
        >
          End game
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-xs dark:text-mafia-muted text-gray-600">Kick player:</p>
        {state.players
          .map((p) => (
            <button
              key={p.id}
              onClick={() => socket.emit('admin_kick_player', { playerId: p.id })}
              className="block text-xs text-red-400 hover:text-red-300"
            >
              Kick {p.username}
            </button>
          ))}
      </div>
    </div>
  );
}
