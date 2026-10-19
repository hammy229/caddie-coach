export const CLUBS = [
  "driver", "3w", "5w", "hybrid", "4i", "5i", "6i", "7i", "8i", "9i", "pw", "gw", "sw", "lw",
] as const;
export type Club = (typeof CLUBS)[number];

/** Typical amateur carry distances (yards), used until a player has logged enough shots. */
export const DEFAULT_CARRY: Record<Club, number> = {
  driver: 230, "3w": 210, "5w": 195, hybrid: 185, "4i": 175, "5i": 165, "6i": 155,
  "7i": 145, "8i": 135, "9i": 125, pw: 115, gw: 100, sw: 85, lw: 70,
};

export type ShotType = "tee" | "approach" | "short_game";
export type Risk = "safe" | "normal" | "aggressive";
export type Handedness = "right" | "left";

export interface Shot {
  id: string;
  roundId: string | null;
  club: Club;
  type: ShotType;
  targetYards: number;
  carryYards: number;
  /** Signed lateral miss in yards: negative = left of target, positive = right. */
  lateralYards: number;
  date: string;
}

export interface Round {
  id: string;
  course: string;
  date: string;
  risk: Risk;
  ended: boolean;
  strokes?: number;
}

export interface Putt {
  id: string;
  roundId: string | null;
  /** Distance of the putt in feet. */
  distanceFeet: number;
  holed: boolean;
  /** Distance left after the putt in feet; 0 when holed. */
  remainingFeet: number;
  date: string;
}

export type SwingFault = "over_the_top" | "early_extension" | "fast_tempo" | "slow_tempo";

export interface SwingAnalysis {
  id: string;
  date: string;
  club?: Club;
  handed: Handedness;
  tempoRatio: number;
  backswingMs: number;
  downswingMs: number;
  spineAngleChangeDeg: number;
  outwardToDropRatio: number;
  faults: SwingFault[];
  reviewed: boolean;
}

export interface UserState {
  risk: Risk;
  rounds: Round[];
  shots: Shot[];
  putts: Putt[];
  swings: SwingAnalysis[];
  activeRoundId: string | null;
}

export const emptyState = (): UserState => ({
  risk: "normal",
  rounds: [],
  shots: [],
  putts: [],
  swings: [],
  activeRoundId: null,
});
