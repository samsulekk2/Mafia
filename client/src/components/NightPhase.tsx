import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import type { GameStatePublic, Role } from '@shared/types';
import { MafiaChat } from './MafiaChat';

interface Props {
  state: GameStatePublic;
  playerId: string;
  myRole: Role | null;
}

export function NightPhase({ state, playerId, myRole }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const socket = getSocket();
  const investigation = useGameStore((s) => s.detectiveInvestigation);
  const mafiaPartners = useGameStore((s) => s.mafiaPartners);
  const mafiaChatMessages = useGameStore((s) => s.mafiaChatMessages);
  const mafiaCurrentTarget = useGameStore((s) => s.mafiaCurrentTarget);

  const me = state.players.find((p) => p.id === playerId);
  const isMafia = myRole === 'mafia';
  const canAct = me?.status === 'alive' && myRole && myRole !== 'civilian';

  // Target rules:
  // - Mafia: all alive non-mafia players, excluding self and partners
  // - Doctor: all alive players INCLUDING self (doctor can self-save)
  // - Detective: all alive players EXCLUDING self
  const targets = state.players.filter((p) => {
    if (p.status !== 'alive') return false;
    if (myRole !== 'doctor' && p.id === playerId) return false;
    if (isMafia && mafiaPartners.includes(p.username)) return false;
    return true;
  });

  const submit = () => {
    if (!selected || !myRole) return;
    const event =
      myRole === 'mafia'
        ? 'role_action_mafia'
        : myRole === 'doctor'
          ? 'role_action_doctor'
          : 'role_action_detective';
    socket.emit(event, { targetId: selected }, (res) => {
      // Mafia can re-select anytime — no permanent lock
      if (res?.ok && !isMafia) setSubmitted(true);
    });
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      <header className="text-center">
        <h2 className="font-display text-3xl text-indigo-400">Night {state.round}</h2>
        <p className="dark:text-mafia-muted text-gray-500 text-sm mt-1">The city sleeps…</p>
      </header>

      {!canAct && (
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-100 text-center dark:border border-white/10 border-gray-200">
          <p className="dark:text-mafia-muted text-gray-500 text-sm">
            {me?.status === 'dead' ? 'You are dead. You cannot act.' : 'Waiting for night to end…'}
          </p>
        </div>
      )}

      {canAct && (
        <div className="space-y-4">
          <p className="text-center text-sm">
            You are the{' '}
            <span className="text-mafia-gold font-semibold capitalize">{myRole}</span>
            {isMafia && (
              <span className="ml-1 text-xs text-red-400">
                — use the chat to agree on one target
              </span>
            )}
          </p>

          {/* Mafia: show current agreed team target in real-time */}
          {isMafia && (
            <div className={`rounded-xl border text-center p-3 transition-all ${
              mafiaCurrentTarget
                ? 'dark:bg-red-900/30 bg-red-50 dark:border-red-500/40 border-red-200'
                : 'dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200'
            }`}>
              <p className="text-xs uppercase tracking-widest dark:text-mafia-muted text-gray-500 mb-1">
                Current team target
              </p>
              {mafiaCurrentTarget ? (
                <p className="font-bold text-mafia-accent text-xl">{mafiaCurrentTarget}</p>
              ) : (
                <p className="dark:text-mafia-muted text-gray-400 text-sm">No target set yet</p>
              )}
              <p className="text-xs dark:text-mafia-muted text-gray-500 mt-1">
                Any mafia member can change this
              </p>
            </div>
          )}

          {/* Target selection grid */}
          <div className="grid grid-cols-2 gap-2">
            {targets.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => !submitted && setSelected(p.id)}
                disabled={submitted}
                className={`p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  selected === p.id
                    ? 'border-mafia-accent bg-mafia-accent/20 dark:text-white text-gray-900'
                    : 'dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white dark:text-white text-gray-900 dark:hover:border-mafia-accent/50 hover:border-red-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {p.username}
                {p.id === playerId && (
                  <span className="ml-1 text-xs text-green-400">(you)</span>
                )}
              </motion.button>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!selected || (submitted && !isMafia)}
            onClick={submit}
            className="w-full py-3.5 rounded-xl bg-mafia-accent hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white transition-colors"
          >
            {isMafia
              ? selected
                ? 'Set team target'
                : 'Select a target first'
              : submitted
                ? 'Action submitted ✓'
                : 'Confirm action'}
          </motion.button>

          {!isMafia && submitted && (
            <p className="text-center text-xs text-green-400">
              ✓ Action locked in — waiting for night to end
            </p>
          )}

          {/* Mafia private chat */}
          {isMafia && (
            <MafiaChat messages={mafiaChatMessages} myUsername={me?.username ?? ''} />
          )}

          {/* Detective private investigation result */}
          {myRole === 'detective' && submitted && investigation && (
            <div className="p-4 rounded-xl dark:bg-blue-900/30 bg-blue-50 border dark:border-blue-500/40 border-blue-200 text-center">
              <p className="text-xs uppercase tracking-widest dark:text-blue-300/70 text-blue-500 mb-1">
                Private result
              </p>
              <p className="font-medium dark:text-white text-gray-900">
                {investigation.targetUsername} is{' '}
                <span className={investigation.result === 'correct' ? 'text-red-400' : 'text-green-400'}>
                  {investigation.result === 'correct' ? 'Mafia' : 'not Mafia'}
                </span>
              </p>
              <p className="text-xs dark:text-mafia-muted text-gray-500 mt-2">
                Only you can see this until day break
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
