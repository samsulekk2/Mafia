import type { DayResultPublic } from '@shared/types';
import { useGameStore } from '../store/gameStore';

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

  const detectiveLabel =
    myRole === 'detective' && detectiveDayReveal && detectiveDayReveal.detectiveResult !== 'none'
      ? `${labelResult(detectiveDayReveal.detectiveResult)} (${detectiveDayReveal.detectiveTargetName})`
      : result.detectiveActed
        ? 'investigation completed'
        : 'none';

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
