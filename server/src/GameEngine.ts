import {
  ALLOWED_USERS,
  ADMIN_USERNAME,
  type DayResult,
  type DayResultPublic,
  type GameConfig,
  type GamePhase,
  type GameStatePublic,
  type MafiaChatMessage,
  type NightActions,
  type Player,
  type Role,
  type RoleConfig,
  type Username,
  type VotingResult,
} from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TIMERS = { night: 60, day: 240, voting: 240 } as const;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class GameEngine {
  readonly roomId: string;
  phase: GamePhase = 'LOBBY';
  players: Map<string, Player> = new Map();
  roleConfig: RoleConfig = { mafia: 2, doctor: 1, detective: 1 };
  gameConfig: GameConfig = {
    nightTime: DEFAULT_TIMERS.night,
    dayTime: DEFAULT_TIMERS.day,
    votingTime: DEFAULT_TIMERS.voting,
    voiceChatEnabled: false,
    revealRolesOnDeath: true,
  };
  timerEndsAt: number | null = null;
  timerPhase: 'night' | 'day' | 'voting' | null = null;
  dayResult: DayResult | null = null;
  votingResult: VotingResult | null = null;
  winner: 'mafia' | 'civilians' | null = null;
  round = 0;

  private nightActions: NightActions = {};
  private votes: Map<string, string> = new Map();
  private skipDiscussionVotes: Set<string> = new Set();
  private mafiaChatMessages: MafiaChatMessage[] = [];
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private onPhaseChange?: () => void;

  constructor(roomId: string, onPhaseChange?: () => void) {
    this.roomId = roomId;
    this.onPhaseChange = onPhaseChange;
  }

  setPhaseChangeCallback(cb: () => void) {
    this.onPhaseChange = cb;
  }

  isAdmin(username: string): boolean {
    return username === ADMIN_USERNAME;
  }

  canAdminAct(): boolean {
    return this.phase === 'LOBBY' || this.phase === 'ENDED';
  }

  addPlayer(username: string, socketId: string): Player {
    const existing = [...this.players.values()].find((p) => p.username === username);
    if (existing) {
      existing.socketId = socketId;
      return existing;
    }
    const player: Player = {
      id: uuidv4(),
      username,
      socketId,
      status: 'alive',
      ready: false,
      disconnected: false,
    };
    this.players.set(player.id, player);
    return player;
  }

  removePlayerBySocket(socketId: string): Player | null {
    for (const [id, p] of this.players) {
      if (p.socketId === socketId) {
        if (this.phase === 'LOBBY' || this.phase === 'ENDED') {
          this.players.delete(id);
        } else {
          // Mark as disconnected instead of removing during game
          p.socketId = '';
          p.disconnected = true;
        }
        return p;
      }
    }
    return null;
  }

  reconnectPlayer(playerId: string, socketId: string): Player | null {
    const p = this.players.get(playerId);
    if (!p) return null;
    p.socketId = socketId;
    p.disconnected = false;
    return p;
  }

  getPlayerById(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  kickPlayer(playerId: string): boolean {
    if (!this.canAdminAct()) return false;
    return this.players.delete(playerId);
  }

  setReady(playerId: string, ready: boolean): boolean {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'LOBBY') return false;
    p.ready = ready;
    return true;
  }

  setRoleConfig(config: RoleConfig): boolean {
    if (!this.canAdminAct()) return false;
    const active = this.getActivePlayers();
    const civilians = active.length - config.mafia - config.doctor - config.detective;
    if (civilians < 0) return false;
    this.roleConfig = config;
    return true;
  }

  toggleVoiceChat(enabled: boolean): boolean {
    if (!this.canAdminAct()) return false;
    this.gameConfig.voiceChatEnabled = enabled;
    return true;
  }

  setGameConfig(config: Partial<GameConfig>): boolean {
    if (!this.canAdminAct()) return false;
    Object.assign(this.gameConfig, config);
    return true;
  }

  getActivePlayers(): Player[] {
    return [...this.players.values()];
  }

  getAlivePlayers(): Player[] {
    return this.getActivePlayers().filter((p) => p.status === 'alive');
  }

  canStartGame(): boolean {
    const active = this.getActivePlayers();
    const total =
      this.roleConfig.mafia +
      this.roleConfig.doctor +
      this.roleConfig.detective;
    const civilians = active.length - total;
    if (civilians < 0) return false;
    if (active.length < 4) return false;
    return active.every((p) => p.ready);
  }

  startGame(): boolean {
    if (!this.canAdminAct() || !this.canStartGame()) return false;
    this.assignRoles(); // sets phase = 'ROLE_ASSIGNMENT'
    this.round = 1;
    this.nightActions = {};
    this.votes.clear();
    this.skipDiscussionVotes.clear();
    this.mafiaChatMessages = [];
    this.dayResult = null;
    this.votingResult = null;
    this.winner = null;
    // Timer is started in beginNightAfterReveal() after roles are shown to clients
    return true;
  }

  endGame(): boolean {
    this.clearTimer();
    this.phase = 'ENDED';
    this.winner = null;
    for (const p of this.getActivePlayers()) {
      p.ready = false;
      p.status = 'alive';
      delete p.role;
    }
    return true;
  }

  restartSession(): boolean {
    this.clearTimer();
    this.phase = 'LOBBY';
    this.round = 0;
    this.nightActions = {};
    this.votes.clear();
    this.skipDiscussionVotes.clear();
    this.dayResult = null;
    this.votingResult = null;
    this.winner = null;
    for (const p of this.getActivePlayers()) {
      p.ready = false;
      p.status = 'alive';
      delete p.role;
    }
    return true;
  }

  private assignRoles(): void {
    const active = shuffle(this.getActivePlayers());
    const roles: Role[] = [];
    for (let i = 0; i < this.roleConfig.mafia; i++) roles.push('mafia');
    for (let i = 0; i < this.roleConfig.doctor; i++) roles.push('doctor');
    for (let i = 0; i < this.roleConfig.detective; i++) roles.push('detective');
    while (roles.length < active.length) roles.push('civilian');
    const shuffledRoles = shuffle(roles);
    active.forEach((p, i) => {
      p.role = shuffledRoles[i];
      p.status = 'alive';
    });
    this.phase = 'ROLE_ASSIGNMENT';
  }

  getRoleAssignment(playerId: string): { role: Role; mafiaPartners?: string[] } | null {
    const p = this.players.get(playerId);
    if (!p?.role) return null;
    if (p.role === 'mafia') {
      const partners = [...this.players.values()]
        .filter((x) => x.role === 'mafia' && x.id !== playerId)
        .map((x) => x.username);
      return { role: p.role, mafiaPartners: partners };
    }
    return { role: p.role };
  }

  beginNightAfterReveal(): void {
    if (this.phase !== 'ROLE_ASSIGNMENT') return;
    this.phase = 'NIGHT';
    this.nightActions = {};
    this.startTimer('night');
  }

  submitMafiaAction(playerId: string, targetId: string): boolean {
    if (this.phase !== 'NIGHT') return false;
    const p = this.players.get(playerId);
    if (!p || p.role !== 'mafia' || p.status !== 'alive' || p.disconnected) return false;
    const target = this.players.get(targetId);
    if (!target || target.status !== 'alive') return false;
    // Prevent Mafia from targeting other Mafia members
    if (target.role === 'mafia') return false;
    this.nightActions.mafiaTarget = targetId;
    return true;
  }

  submitDoctorAction(playerId: string, targetId: string): boolean {
    if (this.phase !== 'NIGHT') return false;
    const p = this.players.get(playerId);
    if (!p || p.role !== 'doctor' || p.status !== 'alive' || p.disconnected) return false;
    const target = this.players.get(targetId);
    if (!target || target.status !== 'alive') return false;
    this.nightActions.doctorTarget = targetId;
    return true;
  }

  submitDetectiveAction(playerId: string, targetId: string): boolean {
    if (this.phase !== 'NIGHT') return false;
    const p = this.players.get(playerId);
    if (!p || p.role !== 'detective' || p.status !== 'alive' || p.disconnected) return false;
    const target = this.players.get(targetId);
    if (!target || target.status !== 'alive') return false;
    this.nightActions.detectiveTarget = targetId;
    return true;
  }

  resolveNight(): DayResult {
    const { mafiaTarget, doctorTarget, detectiveTarget } = this.nightActions;
    let deathResult: DayResult['deathResult'] = null;
    let mafiaResult: DayResult['mafiaResult'] = 'none';
    let doctorResult: DayResult['doctorResult'] = 'none';
    let detectiveResult: DayResult['detectiveResult'] = 'none';
    let detectiveTargetName: string | undefined;

    if (mafiaTarget) {
      mafiaResult = doctorTarget === mafiaTarget ? 'fail' : 'success';
    }
    if (doctorTarget) {
      doctorResult = mafiaTarget === doctorTarget ? 'success' : 'fail';
    }
    if (detectiveTarget) {
      const target = this.players.get(detectiveTarget);
      if (target) {
        detectiveTargetName = target.username;
        detectiveResult = target.role === 'mafia' ? 'correct' : 'incorrect';
      }
    }

    if (mafiaTarget && mafiaTarget !== doctorTarget) {
      const victim = this.players.get(mafiaTarget);
      if (victim) {
        victim.status = 'dead';
        deathResult = { playerId: victim.id, username: victim.username };
      }
    }

    // Clear mafia chat at end of night
    this.clearMafiaChat();

    const result: DayResult = {
      mafiaResult,
      doctorResult,
      detectiveResult,
      detectiveTargetName,
      detectiveActed: Boolean(detectiveTarget),
      deathResult,
    };
    this.dayResult = result;
    this.phase = 'DAY';
    this.startTimer('day');

    // Check win condition after night kill
    const win = this.checkWin();
    if (win) {
      this.winner = win;
      this.phase = 'ENDED';
      this.clearTimer();
    }

    return result;
  }

  submitVote(voterId: string, targetId: string): boolean {
    if (this.phase !== 'VOTING') return false;
    const voter = this.players.get(voterId);
    if (!voter || voter.status !== 'alive' || voter.disconnected) return false;
    if (voterId === targetId) return false; // cannot vote for yourself
    const target = this.players.get(targetId);
    if (!target || target.status !== 'alive') return false;
    this.votes.set(voterId, targetId);

    // Auto-advance if all alive players have voted
    const alivePlayers = this.getAlivePlayers();
    if (this.votes.size === alivePlayers.length) {
      this.clearTimer();
      this.resolveVoting();
      this.advanceAfterVoting();
      this.onPhaseChange?.();
    }

    return true;
  }

  resolveVoting(): VotingResult {
    const voteCounts: Record<string, number> = {};
    for (const targetId of this.votes.values()) {
      voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
    }

    const entries = Object.entries(voteCounts);
    if (entries.length === 0) {
      const result: VotingResult = {
        eliminatedPlayerId: null,
        eliminatedUsername: null,
        voteCounts: {},
        tie: false,
      };
      this.votingResult = result;
      return result;
    }

    const maxVotes = Math.max(...entries.map(([, c]) => c));
    const top = entries.filter(([, c]) => c === maxVotes);

    if (top.length > 1) {
      const pick = top[Math.floor(Math.random() * top.length)];
      return this.eliminateFromVote(pick[0], voteCounts, true);
    }

    return this.eliminateFromVote(top[0][0], voteCounts, false);
  }

  private eliminateFromVote(
    playerId: string,
    voteCounts: Record<string, number>,
    tie: boolean
  ): VotingResult {
    const p = this.players.get(playerId);
    if (p) p.status = 'dead';
    const result: VotingResult = {
      eliminatedPlayerId: playerId,
      eliminatedUsername: p?.username ?? null,
      voteCounts,
      tie,
    };
    this.votingResult = result;
    return result;
  }

  checkWin(): 'mafia' | 'civilians' | null {
    const alive = this.getAlivePlayers();
    const mafiaCount = alive.filter((p) => p.role === 'mafia').length;
    const civilianSide = alive.filter((p) => p.role !== 'mafia').length;

    if (mafiaCount === 0) return 'civilians';
    if (mafiaCount >= civilianSide) return 'mafia';
    return null;
  }

  advanceAfterVoting(): GamePhase {
    const win = this.checkWin();
    if (win) {
      this.winner = win;
      this.phase = 'ENDED';
      this.clearTimer();
      return 'ENDED';
    }
    this.round += 1;
    this.phase = 'NIGHT';
    this.nightActions = {};
    this.votes.clear();
    this.dayResult = null;
    this.votingResult = null;
    this.startTimer('night');
    return 'NIGHT';
  }

  advanceDayToVoting(): void {
    if (this.phase !== 'DAY') return;
    this.phase = 'VOTING';
    this.votes.clear();
    this.skipDiscussionVotes.clear();
    this.startTimer('voting');
  }

  toggleSkipDiscussionVote(playerId: string): boolean {
    if (this.phase !== 'DAY') return false;
    const p = this.players.get(playerId);
    if (!p || p.status !== 'alive') return false;

    if (this.skipDiscussionVotes.has(playerId)) {
      this.skipDiscussionVotes.delete(playerId);
    } else {
      this.skipDiscussionVotes.add(playerId);
    }

    const alivePlayers = this.getAlivePlayers();
    if (this.skipDiscussionVotes.size === alivePlayers.length) {
      this.advanceDayToVoting();
      this.onPhaseChange?.();
    }
    return true;
  }

  getSkipDiscussionVotes(): string[] {
    return [...this.skipDiscussionVotes];
  }

  private startTimer(phase: 'night' | 'day' | 'voting'): void {
    this.clearTimer();
    const seconds = this.gameConfig[`${phase}Time` as keyof GameConfig] as number;
    this.timerPhase = phase;
    this.timerEndsAt = Date.now() + seconds * 1000;
    this.timerHandle = setTimeout(() => this.onTimerEnd(phase), seconds * 1000);
  }

  private onTimerEnd(phase: 'night' | 'day' | 'voting'): void {
    if (this.timerPhase !== phase) return;
    if (phase === 'night') {
      this.resolveNight();
    } else if (phase === 'day') {
      this.advanceDayToVoting();
    } else if (phase === 'voting') {
      this.resolveVoting();
      this.advanceAfterVoting();
    }
    this.onPhaseChange?.();
  }

  clearTimer(): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    this.timerEndsAt = null;
    this.timerPhase = null;
  }

  getDetectiveInvestigationResult(targetId: string): {
    targetUsername: string;
    result: 'correct' | 'incorrect';
  } | null {
    const target = this.players.get(targetId);
    if (!target) return null;
    return {
      targetUsername: target.username,
      result: target.role === 'mafia' ? 'correct' : 'incorrect',
    };
  }

  getDetectivePlayer(): Player | undefined {
    return [...this.players.values()].find((p) => p.role === 'detective' && p.status === 'alive');
  }

  toPublicDayResult(result: DayResult): DayResultPublic {
    return result;
  }

  getPublicState(): GameStatePublic {
    return {
      roomId: this.roomId,
      phase: this.phase,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        username: p.username,
        status: p.status,
        ready: p.ready,
      })),
      roleConfig: { ...this.roleConfig },
      voiceChatEnabled: this.gameConfig.voiceChatEnabled,
      timerEndsAt: this.timerEndsAt,
      timerPhase: this.timerPhase,
      dayResult: this.dayResult ? this.toPublicDayResult(this.dayResult) : null,
      votingResult: this.votingResult,
      winner: this.winner,
      round: this.round,
      skipDiscussionVotes: this.getSkipDiscussionVotes(),
      votedPlayerIds: [...this.votes.keys()],
      revealedRoles: this.winner ? this.getRevealedRoles() : null,
      mafiaChatMessages: [], // Privacy: delivered only to mafia via dedicated event
      gameConfig: {
        nightTime: this.gameConfig.nightTime,
        dayTime: this.gameConfig.dayTime,
        votingTime: this.gameConfig.votingTime,
        revealRolesOnDeath: this.gameConfig.revealRolesOnDeath,
      },
    };
  }

  getMafiaPlayers(): Player[] {
    return [...this.players.values()].filter(
      (p) => p.role === 'mafia' && !p.disconnected && p.socketId !== '',
    );
  }

  getMafiaChatMessages(): MafiaChatMessage[] {
    return [...this.mafiaChatMessages];
  }

  getCurrentMafiaTarget(): string | null {
    const targetId = this.nightActions.mafiaTarget;
    if (!targetId) return null;
    return this.players.get(targetId)?.username ?? null;
  }

  getRemainingSeconds(): number {
    if (!this.timerEndsAt) return 0;
    return Math.max(0, Math.ceil((this.timerEndsAt - Date.now()) / 1000));
  }

  getRevealedRoles(): Array<{ username: string; role: Role }> {
    const revealed: Array<{ username: string; role: Role }> = [];
    for (const player of this.players.values()) {
      if (player.role) {
        revealed.push({ username: player.username, role: player.role });
      }
    }
    return revealed;
  }

  submitMafiaChatMessage(playerId: string, message: string): boolean {
    if (this.phase !== 'NIGHT') return false;
    const p = this.players.get(playerId);
    if (!p || p.role !== 'mafia' || p.status !== 'alive' || p.disconnected) return false;

    const chatMessage: MafiaChatMessage = {
      id: `${Date.now()}-${playerId}`,
      senderId: playerId,
      senderUsername: p.username,
      message,
      timestamp: Date.now(),
    };

    this.mafiaChatMessages.push(chatMessage);
    return true;
  }

  clearMafiaChat(): void {
    this.mafiaChatMessages = [];
  }
}

export function isAllowedUser(username: string): username is Username {
  return (ALLOWED_USERS as readonly string[]).includes(username);
}
