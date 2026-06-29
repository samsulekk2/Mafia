import { motion } from 'framer-motion';

interface Props {
  winner: 'mafia' | 'civilians';
}

export function GameEndScreen({ winner }: Props) {
  const mafiaWon = winner === 'mafia';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto p-8 text-center"
    >
      <h2 className="font-display text-4xl mb-4">Game Over</h2>
      <p className={`text-2xl font-medium ${mafiaWon ? 'text-red-400' : 'text-green-400'}`}>
        {mafiaWon ? 'Mafia wins!' : 'Civilians win!'}
      </p>
      <p className="text-mafia-muted text-sm mt-6">Admin can restart the lobby or end the session.</p>
    </motion.div>
  );
}
