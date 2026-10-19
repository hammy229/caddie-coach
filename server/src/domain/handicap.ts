import { round1 } from "./stats.js";
import type { Round } from "./types.js";

/**
 * A Handicap Index the way the World Handicap System computes one: a score differential
 * per round, then the average of a number of the player's best recent differentials.
 *
 *   differential = (score - course rating) * 113 / slope
 *
 * When a round carries no rating or slope we fall back to its par and a neutral slope of
 * 113, so a casually logged score still contributes a sensible estimate.
 */

const STANDARD_SLOPE = 113;

/** How many of the lowest differentials to use, and the adjustment, by rounds available. */
const TABLE: { upTo: number; count: number; adjust: number }[] = [
  { upTo: 3, count: 1, adjust: -2 },
  { upTo: 4, count: 1, adjust: -1 },
  { upTo: 5, count: 1, adjust: 0 },
  { upTo: 6, count: 2, adjust: -1 },
  { upTo: 8, count: 2, adjust: 0 },
  { upTo: 11, count: 3, adjust: 0 },
  { upTo: 14, count: 4, adjust: 0 },
  { upTo: 16, count: 5, adjust: 0 },
  { upTo: 18, count: 6, adjust: 0 },
  { upTo: 19, count: 7, adjust: 0 },
  { upTo: 20, count: 8, adjust: 0 },
];

function differential(round: Round): number | null {
  if (round.strokes === undefined) return null;
  const rating = round.rating ?? round.par;
  if (rating === undefined) return null;
  const slope = round.slope ?? STANDARD_SLOPE;
  return ((round.strokes - rating) * STANDARD_SLOPE) / slope;
}

export interface HandicapResult {
  index: number;
  roundsUsed: number;
  differentialsCounted: number;
}

/** Handicap Index from the most recent scored rounds, or null with fewer than three. */
export function handicapIndex(rounds: Round[]): HandicapResult | null {
  const recent = rounds
    .filter((r) => r.ended)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20);
  const diffs = recent.map(differential).filter((d): d is number => d !== null);
  if (diffs.length < 3) return null;

  const row = TABLE.find((t) => diffs.length <= t.upTo) ?? TABLE[TABLE.length - 1]!;
  const lowest = [...diffs].sort((a, b) => a - b).slice(0, row.count);
  const avg = lowest.reduce((s, d) => s + d, 0) / lowest.length;
  return {
    index: round1((avg + row.adjust) * 0.96),
    roundsUsed: diffs.length,
    differentialsCounted: row.count,
  };
}

/** Simple scoring average over the player's most recent scored rounds. */
export function scoringAverage(rounds: Round[], window = 10): number | null {
  const scores = rounds
    .filter((r) => r.ended && r.strokes !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-window)
    .map((r) => r.strokes!);
  return scores.length ? round1(scores.reduce((s, x) => s + x, 0) / scores.length) : null;
}
