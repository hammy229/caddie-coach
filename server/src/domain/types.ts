export const CLUBS = [
  "driver", "3w", "5w", "hybrid", "4i", "5i", "6i", "7i", "8i", "9i", "pw", "gw", "sw", "lw",
] as const;
export type Club = (typeof CLUBS)[number];

const CLUB_NAMES: Record<Club, string> = {
  driver: "driver", "3w": "3 wood", "5w": "5 wood", hybrid: "hybrid", "4i": "4 iron", "5i": "5 iron",
  "6i": "6 iron", "7i": "7 iron", "8i": "8 iron", "9i": "9 iron", pw: "pitching wedge", gw: "gap wedge",
  sw: "sand wedge", lw: "lob wedge",
};

/** How a club is said out loud ("7 iron", not "7i"). Structured data keeps the short code. */
export const clubName = (club: Club): string => CLUB_NAMES[club];

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
  /** Par for the course, if known. */
  par?: number;
  /** USGA course rating, if known. */
  rating?: number;
  /** USGA slope rating (55-155), if known. */
  slope?: number;
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
