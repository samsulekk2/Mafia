import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../lib/socket';
import type { MafiaChatMessage } from '@shared/types';

interface Props {
  messages: MafiaChatMessage[];
  myUsername: string;
}

export function MafiaChat({ messages, myUsername }: Props) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    socket.emit('mafia_chat_message', { message: trimmed }, (res: { ok: boolean }) => {
      if (res.ok) setMessage('');
    });
  };

  return (
    <div className="dark:bg-red-950/20 bg-red-50 border dark:border-red-900/40 border-red-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 dark:bg-red-950/30 bg-red-100/60 border-b dark:border-red-900/30 border-red-200">
        <span className="text-base">🎭</span>
        <p className="text-sm font-semibold text-red-400 flex-1">Mafia Chat</p>
        <span className="text-xs dark:text-red-400/40 text-red-400/60">private</span>
      </div>

      {/* Messages */}
      <div className="h-44 overflow-y-auto px-3 py-3 space-y-2">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div key="empty" className="flex items-center justify-center h-full">
              <p className="text-xs dark:text-red-400/30 text-red-400/50 text-center px-4">
                No messages yet — coordinate your kill!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderUsername === myUsername;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 text-sm leading-snug ${
                      isMe
                        ? 'bg-mafia-accent text-white rounded-2xl rounded-br-sm'
                        : 'dark:bg-white/10 bg-white dark:text-white text-gray-900 rounded-2xl rounded-bl-sm border dark:border-white/[0.06] border-gray-200 shadow-sm'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-[10px] font-bold text-red-400 mb-0.5 uppercase tracking-wide">
                        {msg.senderUsername}
                      </p>
                    )}
                    <p>{msg.message}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 px-3 pb-3 pt-2 border-t dark:border-red-900/30 border-red-200"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message your partner…"
          maxLength={500}
          className="flex-1 h-9 dark:bg-white/[0.06] bg-white border dark:border-white/10 border-gray-200 rounded-xl px-3 text-sm dark:text-white text-gray-900 dark:placeholder-white/25 placeholder-gray-400 outline-none focus:border-mafia-accent/50 transition-colors"
        />
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="submit"
          disabled={!message.trim()}
          className="h-9 w-9 rounded-xl bg-mafia-accent hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-px">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </motion.button>
      </form>
    </div>
  );
}
