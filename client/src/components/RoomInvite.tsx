import { useState } from 'react';
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <h3 className="text-sm uppercase tracking-widest text-mafia-muted">Invite players</h3>

      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-lg">
          <QRCodeSVG value={inviteUrl} size={140} level="M" />
        </div>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={inviteUrl}
          className="flex-1 text-xs bg-black/30 rounded-lg px-3 py-2 border border-white/10 truncate"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 px-4 py-2 rounded-lg bg-mafia-gold/20 border border-mafia-gold/40 text-mafia-gold text-sm hover:bg-mafia-gold/30"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <p className="text-xs text-mafia-muted text-center">
        Share the link or scan the QR code to join room <span className="text-white">{roomId}</span>
      </p>
    </div>
  );
}
