import { useState } from 'react';
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

  const me = state.players.find((p) => p.id === playerId);
  const canAct = me?.status === 'alive' && myRole && myRole !== 'civilian';
  const targets = state.players.filter((p) => {
    if (p.status !== 'alive' || p.id === playerId) return false;
    // Mafia cannot target their own partners
    if (myRole === 'mafia' && mafiaPartners.includes(p.username)) return false;
    return true;
  });
  const isMafia = myRole === 'mafia';

  const submit = () => {
    if (!selected || !myRole) return;
    const event =
      myRole === 'mafia'
        ? 'role_action_mafia'
        : myRole === 'doctor'
          ? 'role_action_doctor'
          : 'role_action_detective';
    socket.emit(event, { targetId: selected }, (res) => {
      if (res?.ok) setSubmitted(true);
    });
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <header className="text-center">
        <h2 className="font-display text-3xl text-indigo-400">Night {state.round}</h2>
        <p className="dark:text-mafia-muted text-gray-600 text-sm mt-2">The city sleeps…</p>
      </header>

      {!canAct && (
        <p className="text-center dark:text-mafia-muted text-gray-600">
          {me?.status === 'dead' ? 'You are dead. You cannot act.' : 'Waiting for night to end…'}
        </p>
      )}

      {canAct && (
        <div className="space-y-4">
          <p className="text-center text-sm">
            Select your target as <span className="text-mafia-gold capitalize">{myRole}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {targets.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                disabled={submitted}
                className={`p-3 rounded-lg border transition-all ${
                  selected === p.id
                    ? 'border-mafia-accent bg-mafia-accent/20'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                } disabled:opacity-50`}
              >
                {p.username}
              </button>
            ))}
          </div>
          <button
            disabled={!selected || submitted}
            onClick={submit}
            className="w-full py-3 rounded-xl bg-mafia-accent hover:bg-red-700 disabled:opacity-40 font-medium text-white"
          >
            {submitted ? 'Action submitted' : 'Confirm action'}
          </button>

          {isMafia && (
            <MafiaChat messages={mafiaChatMessages} myUsername={me?.username ?? ''} />
          )}

          {myRole === 'detective' && submitted && investigation && (
            <div className="p-4 rounded-xl bg-blue-900/30 border border-blue-500/40 text-center">
              <p className="text-xs uppercase tracking-widest text-blue-300/70 mb-1">Private result</p>
              <p className="font-medium">
                {investigation.targetUsername} is{' '}
                <span className={investigation.result === 'correct' ? 'text-red-400' : 'text-green-400'}>
                  {investigation.result === 'correct' ? 'Mafia' : 'not Mafia'}
                </span>
              </p>
              <p className="text-xs text-mafia-muted mt-2">Only you can see this until day break</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
