import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { buildRoomInviteUrl, copyRoomLink } from '../lib/room';

interface Props {
  roomId: string;
}

export function RoomInvite({ roomId }: Props) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = buildRoomInviteUrl(roomId);

  const handleCopy = async () => {
    const ok = await copyRoomLink(roomId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="dark:bg-mafia-card bg-white border dark:border-white/[0.06] border-gray-100 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest dark:text-white/40 text-gray-500">
          Invite players
        </p>
        <span className="text-xs dark:text-white/30 text-gray-400 font-mono">{roomId}</span>
      </div>

      {/* QR Code — always white background for scanability */}
      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <QRCodeSVG value={inviteUrl} size={120} level="M" />
        </div>
      </div>

      {/* URL + copy */}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0 dark:bg-white/[0.04] bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-xl px-3 py-2.5 flex items-center">
          <p className="text-xs dark:text-white/40 text-gray-500 truncate font-mono">{inviteUrl}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handleCopy}
          className={`flex-shrink-0 px-4 h-10 rounded-xl text-sm font-semibold border transition-all ${
            copied
              ? 'dark:bg-green-900/30 bg-green-100 dark:text-green-400 text-green-600 dark:border-green-800/50 border-green-200'
              : 'dark:bg-white/[0.06] bg-gray-100 dark:text-white text-gray-700 dark:border-white/10 border-gray-200'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </motion.button>
      </div>
    </div>
  );
}
