export const ALLOWED_USERS = [
  "Shindy",
  "Ali",
  "Sair",
  "Faizan",
  "Faris",
  "Ahmed",
  "Barry",
] as const;

export const ADMIN_USERNAME = "Shindy";

export type Username = (typeof ALLOWED_USERS)[number];

export type Role = "mafia" | "doctor" | "detective" | "civilian";

export type GamePhase =
  | "LOBBY"
  | "ROLE_ASSIGNMENT"
  | "NIGHT"
  | "DAY"
  | "VOTING"
  | "WIN_CHECK"
  | "ENDED";

export type PlayerStatus = "alive" | "dead";

export interface RoleConfig {
  mafia: number;
  doctor: number;
  detective: number;
}

export interface GameConfig {
  nightTime: number;
  dayTime: number;
  votingTime: number;
  voiceChatEnabled: boolean;
  revealRolesOnDeath: boolean;
}

export interface Player {
  id: string;
  username: string;
  socketId: string;
  status: PlayerStatus;
  role?: Role;
  ready: boolean;
  disconnected: boolean;
}

export interface NightActions {
  mafiaTarget?: string;
  doctorTarget?: string;
  detectiveTarget?: string;
}

export interface DetectiveInvestigationResult {
  targetUsername: string;
  result: "correct" | "incorrect";
}

export interface DayResultPublic {
  mafiaResult: "success" | "fail" | "none";
  doctorResult: "success" | "fail" | "none";
  detectiveActed: boolean;
  detectiveResult: "correct" | "incorrect" | "none";
  detectiveTargetName?: string;
  deathResult: { playerId: string; username: string } | null;
}

export interface DayResult extends DayResultPublic {
  // Now identical to DayResultPublic since detective result is public
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
  }>;
  roleConfig: RoleConfig;
  voiceChatEnabled: boolean;
  timerEndsAt: number | null;
  timerPhase: "night" | "day" | "voting" | null;
  dayResult: DayResultPublic | null;
  votingResult: VotingResult | null;
  winner: "mafia" | "civilians" | null;
  round: number;
  skipDiscussionVotes: string[];
  votedPlayerIds: string[];
  revealedRoles: Array<{ username: string; role: Role }> | null;
  mafiaChatMessages: MafiaChatMessage[];
  gameConfig: {
    nightTime: number;
    dayTime: number;
    votingTime: number;
    revealRolesOnDeath: boolean;
  };
}

export interface RoleAssignmentPayload {
  role: Role;
  mafiaPartners?: string[];
}

export interface TimerSync {
  phase: "night" | "day" | "voting";
  endsAt: number;
  remainingSeconds: number;
}

export interface MafiaChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  timestamp: number;
}
