interface Props {
  seconds: number;
  totalSeconds: number;
  phase: string;
}

export function CircularTimer({ seconds, totalSeconds, phase }: Props) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, seconds / totalSeconds);
  const offset = circumference * (1 - progress);
  const urgent = seconds <= 10;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className={`opacity-20 ${urgent ? 'text-mafia-accent' : 'text-white'}`}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-1000 ease-linear ${urgent ? 'text-mafia-accent' : 'text-white'}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-2xl font-mono font-bold tabular-nums ${urgent ? 'text-mafia-accent' : 'text-white'}`}>
          {seconds}
        </div>
        <div className="text-xs uppercase tracking-widest text-mafia-muted mt-1">{phase}</div>
      </div>
    </div>
  );
}
