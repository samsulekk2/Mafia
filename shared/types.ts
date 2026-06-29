export const ALLOWED_USERS = [
  'Shindy',
  'Ali',
  'Sair',
  'Faizan',
  'Faris',
  'Ahmed',
  'Barry',
] as const;

export const ADMIN_USERNAME = 'Shindy';

export type Username = (typeof ALLOWED_USERS)[number];

export type Role = 'mafia' | 'doctor' | 'detective' | 'civilian';

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'NIGHT'
  | 'DAY'
  | 'VOTING'
  | 'WIN_CHECK'
  | 'ENDED';

export type PlayerStatus = 'alive' | 'dead';

export interface RoleConfig {
  mafia: number;
  doctor: number;
  detective: number;
}

export interface Player {
  id: string;
  username: string;
  socketId: string;
  status: PlayerStatus;
  role?: Role;
  ready: boolean;
  isSpectator: boolean;
}

export interface NightActions {
  mafiaTarget?: string;
  doctorTarget?: string;
  detectiveTarget?: string;
}

export interface DetectiveInvestigationResult {
  targetUsername: string;
  result: 'correct' | 'incorrect';
}

export interface DayResultPublic {
  mafiaResult: 'success' | 'fail' | 'none';
  doctorResult: 'success' | 'fail' | 'none';
  /** Public day broadcast — detective details sent separately to detective only */
  detectiveActed: boolean;
  deathResult: { playerId: string; username: string } | null;
}

export interface DayResult extends DayResultPublic {
  detectiveResult: 'correct' | 'incorrect' | 'none';
  detectiveTargetName?: string;
}

export interface VotingResult {
  eliminatedPlayerId: string | null;
  eliminatedUsername: string | null;
  voteCounts: Record<string, number>;
  tie: boolean;
}

export interface GameStatePublic {
  roomId: string;
  phase: GamePhase;
  players: Array<{
    id: string;
    username: string;
    status: PlayerStatus;
    ready: boolean;
    isSpectator: boolean;
  }>;
  roleConfig: RoleConfig;
  voiceChatEnabled: boolean;
  timerEndsAt: number | null;
  timerPhase: 'night' | 'day' | 'voting' | null;
  dayResult: DayResultPublic | null;
  votingResult: VotingResult | null;
  winner: 'mafia' | 'civilians' | null;
  round: number;
  skipDiscussionVotes: string[];
}

export interface RoleAssignmentPayload {
  role: Role;
  mafiaPartners?: string[];
}

export interface TimerSync {
  phase: 'night' | 'day' | 'voting';
  endsAt: number;
  remainingSeconds: number;
}
