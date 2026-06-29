interface Props {
  seconds: number;
  phase: string;
}

export function TimerDisplay({ seconds, phase }: Props) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const urgent = seconds <= 10;

  return (
    <div
      className={`text-center py-3 px-6 rounded-xl border ${
        urgent ? 'border-mafia-accent bg-mafia-accent/10 animate-pulse' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-mafia-muted mb-1">{phase}</div>
      <div className={`text-3xl font-mono tabular-nums ${urgent ? 'text-mafia-accent' : 'text-white'}`}>
        {mins}:{secs.toString().padStart(2, '0')}
      </div>
    </div>
  );
}
