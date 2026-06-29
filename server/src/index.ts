import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { z } from 'zod';
import { getOrCreateRoom } from './RoomManager.js';
import { GameEngine, isAllowedUser } from './GameEngine.js';
import { verifyPassword, getCredentials } from './auth.js';
import { ADMIN_USERNAME } from '../../shared/types.js';

// Load .env only in development (not on Fly.io production)
if (process.env.NODE_ENV !== 'production') {
  const dotenv = (await import('dotenv')).default;
  dotenv.config();
}

getCredentials(); // fail fast if USER_CREDENTIALS is missing or invalid

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const DEFAULT_ROOM_ID = process.env.DEFAULT_ROOM_ID ?? 'main';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

interface SocketData {
  playerId?: string;
  username?: string;
  roomId?: string;
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/** One active socket per whitelisted username (duplicate login kicks the old session). */
const activeUserSockets = new Map<string, string>();

function disconnectDuplicateSession(username: string, currentSocketId: string): void {
  const existingSocketId = activeUserSockets.get(username);
  if (!existingSocketId || existingSocketId === currentSocketId) return;

  io.to(existingSocketId).emit('kicked', { reason: 'Logged in from another device' });
  const oldSocket = io.sockets.sockets.get(existingSocketId);
  oldSocket?.disconnect(true);
}

function registerUserSocket(username: string, socketId: string): void {
  activeUserSockets.set(username, socketId);
}

function unregisterUserSocket(username: string | undefined, socketId: string): void {
  if (username && activeUserSockets.get(username) === socketId) {
    activeUserSockets.delete(username);
  }
}
const joinRoomSchema = z.object({
  roomId: z.string().min(1).optional(),
  asSpectator: z.boolean().optional(),
});
const roleConfigSchema = z.object({
  mafia: z.number().int().min(0),
  doctor: z.number().int().min(0),
  detective: z.number().int().min(0),
});
const targetSchema = z.object({ targetId: z.string().uuid() });
const voteSchema = z.object({ targetId: z.string().uuid() });
const kickSchema = z.object({ playerId: z.string().uuid() });
const voiceSchema = z.object({ enabled: z.boolean() });

const reconnectSchema = z.object({
  playerId: z.string().uuid(),
  roomId: z.string().min(1),
  username: z.string().min(1),
});

function sendPrivateState(room: GameEngine, socketId: string, playerId: string) {
  const assignment = room.getRoleAssignment(playerId);
  if (assignment) {
    io.to(socketId).emit('roles_assigned', assignment);
  }
  const full = room.dayResult;
  if (full && full.detectiveResult !== 'none') {
    const player = room.getPlayerById(playerId);
    if (player?.role === 'detective') {
      io.to(socketId).emit('detective_day_reveal', {
        detectiveResult: full.detectiveResult,
        detectiveTargetName: full.detectiveTargetName,
      });
    }
  }
}

function broadcastState(room: GameEngine) {
  io.to(room.roomId).emit('game_state', room.getPublicState());
}

function timerPayload(room: GameEngine) {
  return room.timerPhase
    ? {
        phase: room.timerPhase,
        endsAt: room.timerEndsAt!,
        remainingSeconds: room.getRemainingSeconds(),
      }
    : null;
}

function setupRoomCallbacks(room: GameEngine) {
  room.setPhaseChangeCallback(() => {
    broadcastState(room);
    const state = room.getPublicState();

    if (state.phase === 'NIGHT' && state.round >= 1) {
      io.to(room.roomId).emit('night_start', {
        round: state.round,
        timer: {
          phase: 'night',
          endsAt: state.timerEndsAt,
          remainingSeconds: room.getRemainingSeconds(),
        },
      });
    }
    if (state.phase === 'DAY' && state.dayResult) {
      const full = room.dayResult!;
      io.to(room.roomId).emit('day_result', {
        ...room.toPublicDayResult(full),
        timer: {
          phase: 'day',
          endsAt: state.timerEndsAt,
          remainingSeconds: room.getRemainingSeconds(),
        },
      });
      const detective = room.getDetectivePlayer();
      if (detective && full.detectiveResult !== 'none') {
        io.to(detective.socketId).emit('detective_day_reveal', {
          detectiveResult: full.detectiveResult,
          detectiveTargetName: full.detectiveTargetName,
        });
      }
    }
    if (state.phase === 'VOTING') {
      io.to(room.roomId).emit('voting_start', {
        timer: {
          phase: 'voting',
          endsAt: state.timerEndsAt,
          remainingSeconds: room.getRemainingSeconds(),
        },
      });
    }
    if (state.phase === 'ENDED' && state.winner) {
      io.to(room.roomId).emit('game_end', { winner: state.winner });
    }
    if (state.votingResult && state.phase !== 'VOTING') {
      io.to(room.roomId).emit('voting_result', state.votingResult);
      if (state.votingResult.eliminatedPlayerId) {
        io.to(room.roomId).emit('player_eliminated', {
          playerId: state.votingResult.eliminatedPlayerId,
          username: state.votingResult.eliminatedUsername,
        });
      }
    }
  });
}

io.on('connection', (socket) => {
  const data = socket.data as SocketData;

  socket.on('login_request', (payload, ack) => {
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Username and password required' });
      return;
    }
    const username = parsed.data.username.trim();
    const password = parsed.data.password;

    if (!verifyPassword(username, password)) {
      ack?.({ ok: false, error: 'Invalid username or password' });
      return;
    }

    disconnectDuplicateSession(username, socket.id);
    registerUserSocket(username, socket.id);
    data.username = username;
    ack?.({ ok: true, username, isAdmin: username === ADMIN_USERNAME });
  });

  socket.on('join_room', (payload, ack) => {
    const parsed = joinRoomSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid join payload' });
      return;
    }
    const roomId = parsed.data.roomId ?? DEFAULT_ROOM_ID;
    const asSpectator = parsed.data.asSpectator ?? false;

    let joinUsername = data.username;
    if (asSpectator) {
      joinUsername = (payload as { displayName?: string })?.displayName ?? `Spectator`;
    } else if (!joinUsername || !isAllowedUser(joinUsername)) {
      ack?.({ ok: false, error: 'Not logged in or unauthorized' });
      return;
    }

    const room = getOrCreateRoom(roomId);
    setupRoomCallbacks(room);

    const player = room.addPlayer(
      asSpectator ? (joinUsername as typeof joinUsername & string) : joinUsername!,
      socket.id,
      asSpectator
    );
    data.playerId = player.id;
    data.roomId = roomId;
    if (!asSpectator) data.username = joinUsername;

    socket.join(roomId);
    ack?.({
      ok: true,
      playerId: player.id,
      roomId,
      isAdmin: !asSpectator && joinUsername === ADMIN_USERNAME,
      state: room.getPublicState(),
    });
    broadcastState(room);
  });

  socket.on('player_ready', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.playerId) {
      ack?.({ ok: false, error: 'Not in room' });
      return;
    }
    const ready = Boolean(payload?.ready);
    const ok = room.setReady(data.playerId, ready);
    ack?.({ ok });
    if (ok) broadcastState(room);
  });

  socket.on('admin_configure_roles', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username || !room.isAdmin(data.username)) {
      ack?.({ ok: false, error: 'Admin only' });
      return;
    }
    const parsed = roleConfigSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid role config' });
      return;
    }
    const ok = room.setRoleConfig(parsed.data);
    ack?.({ ok, roleConfig: room.roleConfig });
    if (ok) broadcastState(room);
  });

  socket.on('admin_configure_game', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username || !room.isAdmin(data.username)) {
      ack?.({ ok: false, error: 'Admin only' });
      return;
    }
    const ok = room.setGameConfig(payload);
    ack?.({ ok, gameConfig: room.gameConfig });
    if (ok) broadcastState(room);
  });

  socket.on('admin_toggle_voice', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username || !room.isAdmin(data.username)) {
      ack?.({ ok: false, error: 'Admin only' });
      return;
    }
    const parsed = voiceSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid payload' });
      return;
    }
    const ok = room.toggleVoiceChat(parsed.data.enabled);
    if (ok) {
      io.to(room.roomId).emit('voice_chat_status', { enabled: room.gameConfig.voiceChatEnabled });
    }
    ack?.({ ok, enabled: room.gameConfig.voiceChatEnabled });
  });

  socket.on('admin_start_game', (_payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username || !room.isAdmin(data.username)) {
      ack?.({ ok: false, error: 'Admin only' });
      return;
    }
    const ok = room.startGame();
    if (ok) {
      io.to(room.roomId).emit('game_start', { round: room.round });
      for (const p of room.getActivePlayers()) {
        const assignment = room.getRoleAssignment(p.id);
        if (assignment) {
          io.to(p.socketId).emit('roles_assigned', assignment);
        }
      }
      setupRoomCallbacks(room);
      room.beginNightAfterReveal();
      broadcastState(room);
      io.to(room.roomId).emit('night_start', {
        round: room.round,
        timer: {
          phase: 'night',
          endsAt: room.timerEndsAt,
          remainingSeconds: room.getRemainingSeconds(),
        },
      });
    }
    ack?.({ ok });
  });

  socket.on('admin_end_game', (_payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username || !room.isAdmin(data.username)) {
      ack?.({ ok: false, error: 'Admin only' });
      return;
    }
    const ok = room.endGame();
    ack?.({ ok });
    if (ok) broadcastState(room);
  });

  socket.on('admin_restart_session', (_payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username || !room.isAdmin(data.username)) {
      ack?.({ ok: false, error: 'Admin only' });
      return;
    }
    const ok = room.restartSession();
    ack?.({ ok });
    if (ok) broadcastState(room);
  });

  socket.on('admin_kick_player', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username || !room.isAdmin(data.username)) {
      ack?.({ ok: false, error: 'Admin only' });
      return;
    }
    const parsed = kickSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid payload' });
      return;
    }
    const target = room.players.get(parsed.data.playerId);
    if (target) {
      io.to(target.socketId).emit('kicked', { reason: 'Kicked by admin' });
    }
    const ok = room.kickPlayer(parsed.data.playerId);
    ack?.({ ok });
    if (ok) broadcastState(room);
  });

  socket.on('role_action_mafia', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.playerId) {
      ack?.({ ok: false, error: 'Not in room' });
      return;
    }
    const parsed = targetSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid target' });
      return;
    }
    const ok = room.submitMafiaAction(data.playerId, parsed.data.targetId);
    ack?.({ ok });
  });

  socket.on('role_action_doctor', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.playerId) {
      ack?.({ ok: false, error: 'Not in room' });
      return;
    }
    const parsed = targetSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid target' });
      return;
    }
    const ok = room.submitDoctorAction(data.playerId, parsed.data.targetId);
    ack?.({ ok });
  });

  socket.on('role_action_detective', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.playerId) {
      ack?.({ ok: false, error: 'Not in room' });
      return;
    }
    const parsed = targetSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid target' });
      return;
    }
    const ok = room.submitDetectiveAction(data.playerId, parsed.data.targetId);
    if (ok) {
      const investigation = room.getDetectiveInvestigationResult(parsed.data.targetId);
      if (investigation) {
        socket.emit('detective_investigation_result', investigation);
      }
    }
    ack?.({ ok });
  });

  socket.on('toggle_skip_discussion', (ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.playerId) {
      ack?.({ ok: false, error: 'Not in room' });
      return;
    }
    const ok = room.toggleSkipDiscussionVote(data.playerId);
    ack?.({ ok });
    broadcastState(room);
  });

  socket.on('vote_player', (payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.playerId) {
      ack?.({ ok: false, error: 'Not in room' });
      return;
    }
    const parsed = voteSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid vote' });
      return;
    }
    const ok = room.submitVote(data.playerId, parsed.data.targetId);
    ack?.({ ok });
  });

  socket.on('request_timer_sync', (_payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room) {
      ack?.({ ok: false });
      return;
    }
    ack?.({
      ok: true,
      timer: room.timerPhase
        ? {
            phase: room.timerPhase,
            endsAt: room.timerEndsAt,
            remainingSeconds: room.getRemainingSeconds(),
          }
        : null,
      state: room.getPublicState(),
    });
  });

  // WebRTC signaling
  socket.on('request_voice_join', (_payload, ack) => {
    const room = data.roomId ? getOrCreateRoom(data.roomId) : null;
    if (!room || !data.username) {
      ack?.({ ok: false, error: 'Not in room' });
      return;
    }
    if (!room.gameConfig.voiceChatEnabled) {
      ack?.({ ok: false, error: 'Voice chat disabled' });
      return;
    }
    ack?.({ ok: true });
    socket.to(room.roomId).emit('voice_peer_joined', {
      socketId: socket.id,
      username: data.username,
    });
  });

  socket.on('voice_signal', (payload) => {
    const { targetSocketId, signal } = payload ?? {};
    if (targetSocketId && signal) {
      io.to(targetSocketId).emit('voice_signal', {
        fromSocketId: socket.id,
        fromUsername: data.username,
        signal,
      });
    }
  });

  socket.on('logout', (_payload, ack) => {
    if (data.roomId) {
      const room = getOrCreateRoom(data.roomId);
      room.removePlayerBySocket(socket.id);
      socket.leave(data.roomId);
      broadcastState(room);
    }
    unregisterUserSocket(data.username, socket.id);
    data.playerId = undefined;
    data.username = undefined;
    data.roomId = undefined;
    ack?.({ ok: true });
  });

  socket.on('reconnect_session', (payload, ack) => {
    const parsed = reconnectSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid reconnect payload' });
      return;
    }
    const { playerId, roomId, username } = parsed.data;
    const room = getOrCreateRoom(roomId);
    setupRoomCallbacks(room);
    const player = room.getPlayerById(playerId);

    if (!player || player.username !== username) {
      ack?.({ ok: false, error: 'Session expired — please log in again' });
      return;
    }

    disconnectDuplicateSession(username, socket.id);
    room.reconnectPlayer(playerId, socket.id);
    data.playerId = playerId;
    data.roomId = roomId;
    data.username = username;
    registerUserSocket(username, socket.id);

    socket.join(roomId);
    sendPrivateState(room, socket.id, playerId);

    const state = room.getPublicState();
    ack?.({
      ok: true,
      playerId,
      roomId,
      isAdmin: room.isAdmin(username),
      state,
      timer: timerPayload(room),
      winner: state.winner,
    });
    broadcastState(room);
  });

  socket.on('disconnect', () => {
    unregisterUserSocket(data.username, socket.id);
    if (!data.roomId) return;
    const room = getOrCreateRoom(data.roomId);
    room.removePlayerBySocket(socket.id);
    broadcastState(room);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Mafia server running on port ${PORT}`);
});
