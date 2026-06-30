import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  seconds: number;
  totalSeconds: number;
  phase: string;
}

function RollingDigit({ digit, urgent }: { digit: string; urgent: boolean }) {
  return (
    <div className="relative overflow-hidden w-4 h-6">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0, 0.67, 0] }}
          className={`absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums text-base leading-none select-none ${
            urgent ? 'text-mafia-accent' : 'dark:text-white text-gray-900'
          }`}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

const PHASE_ICON: Record<string, string> = {
  night: '🌙',
  day: '☀️',
  voting: '🗳️',
};

export function CircularTimer({ seconds, phase }: Props) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const urgent = seconds <= 10;

  return (
    <div
      className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl border transition-all ${
        urgent
          ? 'border-mafia-accent/70 bg-mafia-accent/10 animate-pulse'
          : 'dark:border-white/10 border-gray-200 dark:bg-black/20 bg-gray-50'
      }`}
    >
      <span className="mr-1.5 text-sm leading-none">{PHASE_ICON[phase] ?? ''}</span>
      <RollingDigit digit={String(Math.floor(mins / 10))} urgent={urgent} />
      <RollingDigit digit={String(mins % 10)} urgent={urgent} />
      <span
        className={`mx-0.5 font-mono font-bold text-base leading-none ${
          urgent ? 'text-mafia-accent' : 'dark:text-white text-gray-900'
        }`}
      >
        :
      </span>
      <RollingDigit digit={String(Math.floor(secs / 10))} urgent={urgent} />
      <RollingDigit digit={String(secs % 10)} urgent={urgent} />
    </div>
  );
}
