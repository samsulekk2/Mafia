import { motion } from 'framer-motion';
import type { Role } from '@shared/types';

const ROLE_CONFIG: Record<
  Role,
  { title: string; desc: string; emoji: string; color: string; darkBg: string; lightBg: string }
> = {
  mafia: {
    title: 'Mafia',
    desc: 'Eliminate a civilian each night. Stay hidden.',
    emoji: '🔴',
    color: 'text-red-400',
    darkBg: 'dark:from-red-950/70',
    lightBg: 'from-red-100',
  },
  doctor: {
    title: 'Doctor',
    desc: 'Protect one player from death each night — including yourself.',
    emoji: '💚',
    color: 'text-green-400',
    darkBg: 'dark:from-green-950/70',
    lightBg: 'from-green-100',
  },
  detective: {
    title: 'Detective',
    desc: 'Investigate one player each night. Results are revealed to all at dawn.',
    emoji: '🔵',
    color: 'text-blue-400',
    darkBg: 'dark:from-blue-950/70',
    lightBg: 'from-blue-100',
  },
  civilian: {
    title: 'Civilian',
    desc: 'Find and vote out the mafia. Trust your instincts.',
    emoji: '⚪',
    color: 'text-yellow-400',
    darkBg: 'dark:from-yellow-950/60',
    lightBg: 'from-yellow-50',
  },
};

interface Props {
  role: Role;
  mafiaPartners: string[];
}

export function RoleReveal({ role, mafiaPartners }: Props) {
  const cfg = ROLE_CONFIG[role];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-gradient-to-b ${cfg.darkBg} ${cfg.lightBg} to-transparent dark:bg-mafia-bg bg-mafia-bg-light`}
    >
      {/* Emoji */}
      <motion.span
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.08 }}
        className="text-[88px] leading-none block mb-6"
      >
        {cfg.emoji}
      </motion.span>

      {/* Role name + description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-[0.3em] dark:text-white/30 text-gray-500 mb-2">
          Your role
        </p>
        <h2 className={`font-display text-5xl font-bold ${cfg.color} mb-3`}>{cfg.title}</h2>
        <p className="dark:text-white/50 text-gray-600 text-sm max-w-[270px] leading-relaxed">
          {cfg.desc}
        </p>
      </motion.div>

      {/* Mafia partners */}
      {role === 'mafia' && mafiaPartners.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 w-full max-w-xs dark:bg-red-950/50 bg-red-50 border dark:border-red-800/30 border-red-200 rounded-2xl p-5 text-center"
        >
          <p className="text-xs uppercase tracking-widest text-red-400 mb-3 font-semibold">
            {mafiaPartners.length === 1 ? 'Your partner' : 'Your partners'}
          </p>
          {mafiaPartners.map((name) => (
            <p key={name} className="font-bold dark:text-white text-gray-900 text-xl leading-snug">
              {name}
            </p>
          ))}
          <p className="text-xs dark:text-white/25 text-gray-400 mt-3">
            Coordinate in the mafia chat during night
          </p>
        </motion.div>
      )}

      {/* Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-10 text-xs dark:text-white/20 text-gray-400 animate-pulse"
      >
        Game starting…
      </motion.p>
    </motion.div>
  );
}
