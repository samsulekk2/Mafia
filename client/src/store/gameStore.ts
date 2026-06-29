import { create } from 'zustand';
import type {
  DayResult,
  DayResultPublic,
  DetectiveInvestigationResult,
  GameStatePublic,
  MafiaChatMessage,
  Role,
  RoleAssignmentPayload,
  TimerSync,
  VotingResult,
} from '@shared/types';

interface GameStore {
  username: string | null;
  playerId: string | null;
  isAdmin: boolean;
  connected: boolean;
  reconnecting: boolean;
  error: string | null;

  gameState: GameStatePublic | null;
  myRole: Role | null;
  mafiaPartners: string[];
  timer: TimerSync | null;
  lastDayResult: (DayResultPublic & { timer?: TimerSync }) | null;
  lastVotingResult: VotingResult | null;
  gameWinner: 'mafia' | 'civilians' | null;
  detectiveInvestigation: DetectiveInvestigationResult | null;
  detectiveDayReveal: Pick<DayResult, 'detectiveResult' | 'detectiveTargetName'> | null;
  mafiaChatMessages: MafiaChatMessage[];

  setUsername: (username: string | null) => void;
  setPlayerId: (id: string | null) => void;
  setIsAdmin: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  setReconnecting: (v: boolean) => void;
  setError: (error: string | null) => void;
  setGameState: (state: GameStatePublic | null) => void;
  setRoleAssignment: (payload: RoleAssignmentPayload) => void;
  setTimer: (timer: TimerSync | null) => void;
  setLastDayResult: (result: (DayResultPublic & { timer?: TimerSync }) | null) => void;
  setLastVotingResult: (result: VotingResult | null) => void;
  setGameWinner: (winner: 'mafia' | 'civilians' | null) => void;
  setDetectiveInvestigation: (result: DetectiveInvestigationResult | null) => void;
  setDetectiveDayReveal: (
    result: Pick<DayResult, 'detectiveResult' | 'detectiveTargetName'> | null
  ) => void;
  setMafiaChatMessages: (messages: MafiaChatMessage[]) => void;
  reset: () => void;
}

const initialState = {
  username: null as string | null,
  playerId: null as string | null,
  isAdmin: false,
  connected: false,
  reconnecting: false,
  error: null as string | null,
  gameState: null as GameStatePublic | null,
  myRole: null as Role | null,
  mafiaPartners: [] as string[],
  timer: null as TimerSync | null,
  lastDayResult: null as (DayResult & { timer?: TimerSync }) | null,
  lastVotingResult: null as VotingResult | null,
  gameWinner: null as 'mafia' | 'civilians' | null,
  detectiveInvestigation: null as DetectiveInvestigationResult | null,
  detectiveDayReveal: null as Pick<DayResult, 'detectiveResult' | 'detectiveTargetName'> | null,
  mafiaChatMessages: [] as MafiaChatMessage[],
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  setUsername: (username) => set({ username }),
  setPlayerId: (playerId) => set({ playerId }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setConnected: (connected) => set({ connected }),
  setReconnecting: (reconnecting) => set({ reconnecting }),
  setError: (error) => set({ error }),
  setGameState: (gameState) => set({ gameState }),
  setRoleAssignment: (payload) =>
    set({
      myRole: payload.role,
      mafiaPartners: payload.mafiaPartners ?? [],
    }),
  setTimer: (timer) => set({ timer }),
  setLastDayResult: (lastDayResult) => set({ lastDayResult }),
  setLastVotingResult: (lastVotingResult) => set({ lastVotingResult }),
  setGameWinner: (gameWinner) => set({ gameWinner }),
  setDetectiveInvestigation: (detectiveInvestigation) => set({ detectiveInvestigation }),
  setDetectiveDayReveal: (detectiveDayReveal) => set({ detectiveDayReveal }),
  setMafiaChatMessages: (mafiaChatMessages) => set({ mafiaChatMessages }),
  reset: () => set({ ...initialState }),
}));
