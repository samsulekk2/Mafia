import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ALLOWED_USERS } from '@shared/types';

interface Props {
  onLogin: (username: string, password: string) => void;
  loading: boolean;
  error: string | null;
  roomId: string;
}

export function LoginPage({ onLogin, loading, error, roomId }: Props) {
  const [username, setUsername] = useState<string>(ALLOWED_USERS[0]);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password.trim()) return;
    onLogin(username, password);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-5 dark:bg-mafia-bg bg-mafia-bg-light">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
            className="text-7xl block mb-4"
          >
            🎭
          </motion.span>
          <h1 className="font-display text-4xl dark:text-white text-gray-900 font-bold tracking-tight">
            Mafia
          </h1>
          <p className="text-sm dark:text-white/40 text-gray-500 mt-1">
            Room{' '}
            <span className="font-semibold dark:text-white/70 text-gray-700">{roomId}</span>
          </p>
        </div>

        {/* Card */}
        <div className="dark:bg-mafia-card bg-white rounded-2xl border dark:border-white/[0.06] border-black/[0.06] shadow-xl shadow-black/10 p-6 space-y-4">
          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
                {error}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest dark:text-white/40 text-gray-500 mb-1.5">
                Username
              </label>
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full h-12 dark:bg-white/[0.06] bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 text-base dark:text-white text-gray-900 outline-none focus:border-mafia-accent/60 transition-colors disabled:opacity-50"
              >
                {ALLOWED_USERS.map((name) => (
                  <option key={name} value={name} className="dark:bg-mafia-card bg-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest dark:text-white/40 text-gray-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full h-12 dark:bg-white/[0.06] bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 text-base dark:text-white text-gray-900 dark:placeholder-white/20 placeholder-gray-400 outline-none focus:border-mafia-accent/60 transition-colors disabled:opacity-50"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full h-12 rounded-xl bg-mafia-accent hover:bg-red-700 text-white font-semibold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
