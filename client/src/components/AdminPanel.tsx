import { useState } from 'react';
import { getSocket } from '../lib/socket';
import type { GameStatePublic } from '@shared/types';

interface Props {
  state: GameStatePublic;
}

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-mafia-accent' : 'dark:bg-white/10 bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm dark:text-white/70 text-gray-700">{label}</span>
    </label>
  );
}

export function AdminPanel({ state }: Props) {
  const [mafia, setMafia] = useState(state.roleConfig.mafia);
  const [doctor, setDoctor] = useState(state.roleConfig.doctor);
  const [detective, setDetective] = useState(state.roleConfig.detective);
  const [nightTime, setNightTime] = useState(state.gameConfig.nightTime);
  const [dayTime, setDayTime] = useState(state.gameConfig.dayTime);
  const [votingTime, setVotingTime] = useState(state.gameConfig.votingTime);
  const [revealRolesOnDeath, setRevealRolesOnDeath] = useState(state.gameConfig.revealRolesOnDeath);
  const socket = getSocket();

  const applyRoles = () => socket.emit('admin_configure_roles', { mafia, doctor, detective });

  const applyGameConfig = () =>
    socket.emit('admin_configure_game', {
      nightTime,
      dayTime,
      votingTime,
      voiceChatEnabled: state.voiceChatEnabled,
      revealRolesOnDeath,
    });

  const inputCls =
    'w-full h-10 dark:bg-white/[0.06] bg-white border dark:border-white/10 border-gray-200 rounded-xl px-3 text-sm dark:text-white text-gray-900 outline-none focus:border-mafia-accent/50 transition-colors text-center';

  const sectionBtnCls =
    'mt-3 w-full h-9 rounded-xl dark:bg-white/[0.06] bg-gray-50 border dark:border-white/10 border-gray-200 text-sm dark:text-white/70 text-gray-700 font-medium hover:border-mafia-accent/50 transition-colors';

  return (
    <div className="dark:bg-red-950/20 bg-red-50 border dark:border-red-900/30 border-red-200 rounded-2xl p-4 space-y-5">
      <p className="text-xs font-bold uppercase tracking-widest text-mafia-accent">Admin Controls</p>

      {/* Role counts */}
      <div>
        <p className="text-xs dark:text-white/40 text-gray-500 mb-2.5 font-medium">Role count</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { label: 'Mafia', color: 'dark:text-red-400 text-red-600', val: mafia, set: setMafia },
              { label: 'Doctor', color: 'dark:text-green-400 text-green-600', val: doctor, set: setDoctor },
              { label: 'Detective', color: 'dark:text-blue-400 text-blue-600', val: detective, set: setDetective },
            ] as const
          ).map(({ label, color, val, set }) => (
            <div key={label}>
              <p className={`text-xs font-semibold mb-1 ${color}`}>{label}</p>
              <input
                type="number"
                min={0}
                value={val}
                onChange={(e) => set(Math.max(0, +e.target.value))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <button onClick={applyRoles} className={sectionBtnCls}>
          Apply roles
        </button>
      </div>

      {/* Timers */}
      <div>
        <p className="text-xs dark:text-white/40 text-gray-500 mb-2.5 font-medium">
          Timer durations (seconds)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { label: '🌙 Night', val: nightTime, set: setNightTime },
              { label: '☀️ Day', val: dayTime, set: setDayTime },
              { label: '🗳️ Vote', val: votingTime, set: setVotingTime },
            ] as const
          ).map(({ label, val, set }) => (
            <div key={label}>
              <p className="text-xs font-semibold dark:text-white/60 text-gray-600 mb-1">{label}</p>
              <input
                type="number"
                min={10}
                value={val}
                onChange={(e) => set(Math.max(10, +e.target.value))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <button onClick={applyGameConfig} className={sectionBtnCls}>
          Apply timers
        </button>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <p className="text-xs dark:text-white/40 text-gray-500 font-medium">Game settings</p>
        <Toggle
          checked={revealRolesOnDeath}
          onChange={setRevealRolesOnDeath}
          label="Reveal roles on death"
        />
        <button onClick={applyGameConfig} className={sectionBtnCls}>
          Apply settings
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => socket.emit('admin_toggle_voice', { enabled: !state.voiceChatEnabled })}
          className="h-10 rounded-xl dark:bg-white/[0.06] bg-white border dark:border-white/10 border-gray-200 text-sm dark:text-white/70 text-gray-700 font-medium transition-colors"
        >
          {state.voiceChatEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
        </button>
        <button
          onClick={() => socket.emit('admin_restart_session', {})}
          className="h-10 rounded-xl dark:bg-white/[0.06] bg-white border dark:border-white/10 border-gray-200 text-sm dark:text-white/70 text-gray-700 font-medium transition-colors"
        >
          🔄 Restart lobby
        </button>
        <button
          onClick={() => socket.emit('admin_end_game', {})}
          className="h-10 rounded-xl dark:bg-white/[0.06] bg-white border dark:border-white/10 border-gray-200 text-sm dark:text-white/70 text-gray-700 font-medium col-span-2 transition-colors"
        >
          ⏹ End game
        </button>
      </div>

      {/* Kick */}
      {state.players.length > 0 && (
        <div>
          <p className="text-xs dark:text-white/40 text-gray-500 mb-2 font-medium">Kick player</p>
          <div className="flex flex-wrap gap-2">
            {state.players.map((p) => (
              <button
                key={p.id}
                onClick={() => socket.emit('admin_kick_player', { playerId: p.id })}
                className="text-xs px-3 py-1.5 rounded-lg dark:bg-red-900/30 bg-red-100 border dark:border-red-900/40 border-red-200 text-red-400 hover:dark:bg-red-900/50 hover:bg-red-200 transition-colors"
              >
                Kick {p.username}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
