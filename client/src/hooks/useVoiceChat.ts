import { useEffect, useRef } from 'react';
import { getIceServers } from '../lib/webrtc';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';

export function useVoiceChat() {
  const voiceEnabled = useGameStore((s) => s.gameState?.voiceChatEnabled ?? false);
  const phase = useGameStore((s) => s.gameState?.phase);
  const playerId = useGameStore((s) => s.playerId);
  const gameState = useGameStore((s) => s.gameState);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const player = gameState?.players.find(p => p.id === playerId);
  const isAlive = player?.status === 'alive';
  const gameInProgress = phase !== 'LOBBY' && phase !== 'ENDED';
  const active = voiceEnabled && (phase === 'LOBBY' || gameInProgress || phase === 'ENDED');

  useEffect(() => {
    if (!active) {
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      return;
    }

    const socket = getSocket();
    let cancelled = false;

    async function setup() {
      socket.emit('request_voice_join', {}, async (res) => {
        if (!res?.ok || cancelled) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
        } catch {
          /* mic denied */
        }
      });
    }

    async function handlePeerJoined({ socketId }: { socketId: string }) {
      if (cancelled || peersRef.current.has(socketId)) return;
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      peersRef.current.set(socketId, pc);

      // Only send audio if player is alive
      if (isAlive) {
        localStreamRef.current?.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('voice_signal', {
            targetSocketId: socketId,
            signal: { type: 'candidate', candidate: e.candidate },
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice_signal', {
        targetSocketId: socketId,
        signal: { type: 'offer', sdp: offer },
      });
    }

    async function handleSignal(payload: {
      fromSocketId: string;
      fromUsername?: string;
      signal: unknown;
    }) {
      const { fromSocketId } = payload;
      const signal = payload.signal as {
        type: string;
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
      let pc = peersRef.current.get(fromSocketId);
      if (!pc && signal.type === 'offer') {
        pc = new RTCPeerConnection({ iceServers: getIceServers() });
        peersRef.current.set(fromSocketId, pc);
        // Only send audio if player is alive
        if (isAlive) {
          localStreamRef.current?.getTracks().forEach((track) => {
            pc!.addTrack(track, localStreamRef.current!);
          });
        }
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('voice_signal', {
              targetSocketId: fromSocketId,
              signal: { type: 'candidate', candidate: e.candidate },
            });
          }
        };
      }
      if (!pc) return;

      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(signal.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice_signal', {
          targetSocketId: fromSocketId,
          signal: { type: 'answer', sdp: answer },
        });
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(signal.sdp);
      } else if (signal.type === 'candidate' && signal.candidate) {
        await pc.addIceCandidate(signal.candidate);
      }
    }

    setup();
    socket.on('voice_peer_joined', handlePeerJoined);
    socket.on('voice_signal', handleSignal);

    return () => {
      cancelled = true;
      socket.off('voice_peer_joined', handlePeerJoined);
      socket.off('voice_signal', handleSignal);
    };
  }, [active]);

  return { voiceActive: active };
}
