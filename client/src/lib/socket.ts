import { io, Socket } from 'socket.io-client';
import type {
  DayResult,
  DayResultPublic,
  DetectiveInvestigationResult,
  GameStatePublic,
  MafiaChatMessage,
  RoleAssignmentPayload,
  TimerSync,
  VotingResult,
} from '@shared/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export type GameSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

interface ClientToServerEvents {
  login_request: (
    payload: { username: string; password: string },
    ack?: (res: { ok: boolean; error?: string; username?: string; isAdmin?: boolean }) => void
  ) => void;
  join_room: (
    payload: { roomId?: string },
    ack?: (res: {
      ok: boolean;
      error?: string;
      playerId?: string;
      roomId?: string;
      isAdmin?: boolean;
      state?: GameStatePublic;
    }) => void
  ) => void;
  player_ready: (payload: { ready: boolean }, ack?: (res: { ok: boolean }) => void) => void;
  admin_configure_roles: (
    payload: { mafia: number; doctor: number; detective: number },
    ack?: (res: { ok: boolean; error?: string; roleConfig?: unknown }) => void
  ) => void;
  admin_configure_game: (
    payload: {
      nightTime?: number;
      dayTime?: number;
      votingTime?: number;
      voiceChatEnabled?: boolean;
      revealRolesOnDeath?: boolean;
    },
    ack?: (res: { ok: boolean; gameConfig?: unknown }) => void
  ) => void;
  admin_toggle_voice: (payload: { enabled: boolean }, ack?: (res: { ok: boolean; enabled?: boolean }) => void) => void;
  admin_start_game: (_payload: unknown, ack?: (res: { ok: boolean; error?: string }) => void) => void;
  admin_end_game: (_payload: unknown, ack?: (res: { ok: boolean }) => void) => void;
  admin_restart_session: (_payload: unknown, ack?: (res: { ok: boolean }) => void) => void;
  admin_kick_player: (payload: { playerId: string }, ack?: (res: { ok: boolean }) => void) => void;
  role_action_mafia: (payload: { targetId: string }, ack?: (res: { ok: boolean }) => void) => void;
  role_action_doctor: (payload: { targetId: string }, ack?: (res: { ok: boolean }) => void) => void;
  role_action_detective: (payload: { targetId: string }, ack?: (res: { ok: boolean }) => void) => void;
  mafia_chat_message: (payload: { message: string }, ack?: (res: { ok: boolean }) => void) => void;
  toggle_skip_discussion: (ack?: (res: { ok: boolean }) => void) => void;
  vote_player: (payload: { targetId: string }, ack?: (res: { ok: boolean }) => void) => void;
  request_timer_sync: (
    _payload: unknown,
    ack?: (res: { ok: boolean; timer?: TimerSync | null; state?: GameStatePublic }) => void
  ) => void;
  request_voice_join: (_payload: unknown, ack?: (res: { ok: boolean; error?: string }) => void) => void;
  voice_signal: (payload: { targetSocketId: string; signal: unknown }) => void;
  reconnect_session: (
    payload: { playerId: string; roomId: string; username: string },
    ack?: (res: {
      ok: boolean;
      error?: string;
      playerId?: string;
      roomId?: string;
      isAdmin?: boolean;
      state?: GameStatePublic;
      timer?: TimerSync | null;
      winner?: 'mafia' | 'civilians' | null;
    }) => void
  ) => void;
  logout: (_payload: unknown, ack?: (res: { ok: boolean }) => void) => void;
}

interface ServerToClientEvents {
  game_state: (state: GameStatePublic) => void;
  game_start: (payload: { round: number }) => void;
  roles_assigned: (payload: RoleAssignmentPayload) => void;
  night_start: (payload: { round: number; timer: TimerSync }) => void;
  day_result: (payload: DayResultPublic & { timer: TimerSync }) => void;
  detective_investigation_result: (payload: DetectiveInvestigationResult) => void;
  detective_day_reveal: (payload: Pick<DayResult, 'detectiveResult' | 'detectiveTargetName'>) => void;
  voting_start: (payload: { timer: TimerSync }) => void;
  voting_result: (payload: VotingResult) => void;
  player_eliminated: (payload: { playerId: string; username: string | null }) => void;
  game_end: (payload: { winner: 'mafia' | 'civilians' }) => void;
  voice_chat_status: (payload: { enabled: boolean }) => void;
  voice_peer_joined: (payload: { socketId: string; username: string }) => void;
  voice_signal: (payload: { fromSocketId: string; fromUsername?: string; signal: unknown }) => void;
  kicked: (payload: { reason: string }) => void;
  mafia_chat_update: (payload: MafiaChatMessage[]) => void;
  mafia_target_update: (payload: { targetUsername: string }) => void;
}

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket(): GameSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
