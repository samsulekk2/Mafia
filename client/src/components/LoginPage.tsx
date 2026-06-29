import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ALLOWED_USERS } from '@shared/types';

interface Props {
  onLogin: (username: string, password: string) => void;
  onSpectator: () => void;
  loading: boolean;
  error: string | null;
  roomId: string;
}

export function LoginPage({ onLogin, onSpectator, loading, error, roomId }: Props) {
  const [username, setUsername] = useState<string>(ALLOWED_USERS[0]);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password.trim()) return;
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-mafia-card rounded-2xl p-8 border border-white/10 shadow-2xl"
      >
        <h1 className="font-display text-4xl text-center text-mafia-accent mb-2">Mafia Online</h1>
        <p className="text-center text-mafia-muted text-sm mb-2">Hostless · Server-authoritative</p>
        <p className="text-center text-mafia-gold/80 text-xs mb-8">
          Joining room: <span className="font-medium">{roomId}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-mafia-muted">
            Username
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="mt-1 w-full bg-black/30 rounded-lg px-3 py-2.5 border border-white/10 focus:border-mafia-accent/50 outline-none"
            >
              {ALLOWED_USERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-mafia-muted">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="mt-1 w-full bg-black/30 rounded-lg px-3 py-2.5 border border-white/10 focus:border-mafia-accent/50 outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 rounded-xl bg-mafia-accent hover:bg-red-700 border border-mafia-accent/50 transition-all font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          disabled={loading}
          onClick={onSpectator}
          className="mt-4 w-full py-2 text-sm text-mafia-muted hover:text-white transition-colors disabled:opacity-50"
        >
          Join as spectator
        </button>
      </motion.div>
    </div>
  );
}
