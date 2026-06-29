import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

interface Props {
  winner: 'mafia' | 'civilians';
}

export function GameEndScreen({ winner }: Props) {
  const mafiaWon = winner === 'mafia';
  const gameState = useGameStore((s) => s.gameState);
  const revealedRoles = gameState?.revealedRoles ?? [];

  const mafiaMembers = revealedRoles
    .filter((r) => r.role === 'mafia')
    .map((r) => r.username);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto p-8 text-center space-y-6"
    >
      <h2 className="font-display text-4xl">Game Over</h2>
      <p className={`text-2xl font-medium ${mafiaWon ? 'text-red-400' : 'text-green-400'}`}>
        {mafiaWon ? 'Mafia wins!' : 'Civilians win!'}
      </p>
      
      {mafiaMembers.length > 0 && (
        <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-4 dark:border border-white/10 border-gray-300">
          <h3 className="text-sm font-medium dark:text-mafia-muted text-gray-600 mb-3">Mafia Members Revealed</h3>
          <div className="space-y-2">
            {mafiaMembers.map((name) => (
              <div key={name} className="text-red-400 font-medium">{name}</div>
            ))}
          </div>
        </div>
      )}
      
      <p className="dark:text-mafia-muted text-gray-600 text-sm">Admin can restart the lobby or end the session.</p>
    </motion.div>
  );
}
