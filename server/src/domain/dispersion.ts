import { mean, stdDev } from "./stats.js";
import { CLUBS, DEFAULT_CARRY, type Club, type Shot } from "./types.js";

export const MIN_PERSONAL_SHOTS = 3;
const RECENT_WINDOW = 20;

export interface ClubModel {
  club: Club;
  meanCarry: number;
  sdCarry: number;
  /** Average lateral miss, negative = left. */
  meanLateral: number;
  sdLateral: number;
  shots: number;
  source: "personal" | "default";
}

/**
 * The player's own dispersion for one club, from their most recent full swings.
 * Falls back to typical amateur numbers until enough shots are logged.
 */
export function clubModel(shots: Shot[], club: Club): ClubModel {
  const recent = shots
    .filter((s) => s.club === club && s.type !== "short_game")
    .slice(-RECENT_WINDOW);

  if (recent.length < MIN_PERSONAL_SHOTS) {
    const carry = DEFAULT_CARRY[club];
    return {
      club,
      meanCarry: carry,
      sdCarry: Math.max(5, carry * 0.07),
      meanLateral: 0,
      sdLateral: Math.max(4, carry * 0.06),
      shots: recent.length,
      source: "default",
    };
  }

  const carries = recent.map((s) => s.carryYards);
  const laterals = recent.map((s) => s.lateralYards);
  return {
    club,
    meanCarry: mean(carries),
    sdCarry: Math.max(4, stdDev(carries)),
    meanLateral: mean(laterals),
    sdLateral: Math.max(3, stdDev(laterals)),
    shots: recent.length,
    source: "personal",
  };
}

export function bagModel(shots: Shot[]): ClubModel[] {
  return CLUBS.map((c) => clubModel(shots, c));
}
