import { motion } from 'framer-motion';
import type { Role } from '@shared/types';

const ROLE_LABELS: Record<Role, { title: string; desc: string; color: string }> = {
  mafia: { title: 'Mafia', desc: 'Eliminate civilians at night.', color: 'text-red-400' },
  doctor: { title: 'Doctor', desc: 'Save one player each night.', color: 'text-green-400' },
  detective: { title: 'Detective', desc: 'Investigate one player each night.', color: 'text-blue-400' },
  civilian: { title: 'Civilian', desc: 'Find and vote out the mafia.', color: 'text-mafia-gold' },
};

interface Props {
  role: Role;
  mafiaPartners: string[];
}

export function RoleReveal({ role, mafiaPartners }: Props) {
  const info = ROLE_LABELS[role];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto p-8 text-center"
    >
      <p className="text-mafia-muted text-sm uppercase tracking-widest mb-4">Your role</p>
      <h2 className={`font-display text-5xl mb-4 ${info.color}`}>{info.title}</h2>
      <p className="text-white/80 mb-6">{info.desc}</p>
      {role === 'mafia' && mafiaPartners.length > 0 && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30">
          <p className="text-sm text-mafia-muted mb-2">Your mafia partners:</p>
          <p className="font-medium">{mafiaPartners.join(', ')}</p>
        </div>
      )}
    </motion.div>
  );
}
