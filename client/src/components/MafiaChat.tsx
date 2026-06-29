import { useState, useRef, useEffect } from 'react';
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
    if (!message.trim()) return;
    socket.emit('mafia_chat_message', { message }, (res: { ok: boolean }) => {
      if (res.ok) setMessage('');
    });
  };

  return (
    <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-4 dark:border border-white/10 border-gray-300 space-y-3">
      <h3 className="text-sm font-medium dark:text-mafia-muted text-gray-600">Mafia Chat</h3>
      
      <div className="h-48 overflow-y-auto space-y-2 p-2 dark:bg-black/20 bg-gray-200 rounded-lg">
        {messages.length === 0 ? (
          <p className="text-center text-sm dark:text-mafia-muted text-gray-600 py-8">
            No messages yet. Discuss your target!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${
                msg.senderUsername === myUsername
                  ? 'text-right'
                  : 'text-left'
              }`}
            >
              <span className={`inline-block px-2 py-1 rounded-lg ${
                msg.senderUsername === myUsername
                  ? 'bg-mafia-accent/20 text-mafia-accent'
                  : 'dark:bg-white/10 bg-gray-300'
              }`}
              >
                <span className="font-medium">{msg.senderUsername}:</span>{' '}
                {msg.message}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 dark:bg-black/30 bg-gray-200 rounded-lg px-3 py-2 text-sm dark:border border-white/10 border-gray-300 focus:border-mafia-accent/50 outline-none"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="px-4 py-2 rounded-lg bg-mafia-accent hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
