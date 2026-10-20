import { clubModel } from "./dispersion.js";
import { mean } from "./stats.js";
import { clubName, type Shot, type SwingAnalysis, type SwingFault } from "./types.js";

export interface Insight {
  kind:
    | "approaches_short"
    | "approaches_long"
    | "tee_miss_right"
    | "tee_miss_left"
    | "distance_drop"
    | "recurring_swing_fault";
  message: string;
}

const STREAK = 3;
const MISS_YARDS = 5;
const TEE_MISS_YARDS = 10;

/** Length of the trailing run of items matching `pred`. */
function trailingRun<T>(items: T[], pred: (t: T) => boolean): T[] {
  const run: T[] = [];
  for (let i = items.length - 1; i >= 0 && pred(items[i]!); i--) run.unshift(items[i]!);
  return run;
}

/**
 * Patterns worth raising without being asked, checked after every logged shot.
 * `roundShots` are this round's shots in order; `history` is everything before the round.
 */
export function detectShotPatterns(roundShots: Shot[], history: Shot[]): Insight[] {
  const insights: Insight[] = [];
  const approaches = roundShots.filter((s) => s.type === "approach");
  const tees = roundShots.filter((s) => s.type === "tee");

  const short = trailingRun(approaches, (s) => s.carryYards < s.targetYards - MISS_YARDS);
  if (short.length >= STREAK) {
    const avg = Math.round(mean(short.map((s) => s.targetYards - s.carryYards)));
    insights.push({
      kind: "approaches_short",
      message: `Your last ${short.length} approach shots came up short by about ${avg} yards. Want to take one more club?`,
    });
  }
  const long = trailingRun(approaches, (s) => s.carryYards > s.targetYards + MISS_YARDS);
  if (long.length >= STREAK) {
    const avg = Math.round(mean(long.map((s) => s.carryYards - s.targetYards)));
    insights.push({
      kind: "approaches_long",
      message: `Your last ${long.length} approach shots flew about ${avg} yards long. Consider one less club.`,
    });
  }

  const right = trailingRun(tees, (s) => s.lateralYards > TEE_MISS_YARDS);
  if (right.length >= STREAK) {
    const avg = Math.round(mean(right.map((s) => s.lateralYards)));
    insights.push({
      kind: "tee_miss_right",
      message: `That's ${right.length} tee shots in a row missing right, about ${avg} yards on average. Try aiming down the left side.`,
    });
  }
  const left = trailingRun(tees, (s) => s.lateralYards < -TEE_MISS_YARDS);
  if (left.length >= STREAK) {
    const avg = Math.round(mean(left.map((s) => -s.lateralYards)));
    insights.push({
      kind: "tee_miss_left",
      message: `That's ${left.length} tee shots in a row missing left, about ${avg} yards on average. Try aiming down the right side.`,
    });
  }

  // Same club, noticeably shorter today than the player's own history: often fatigue or tension.
  const last = roundShots[roundShots.length - 1];
  if (last && last.type !== "short_game") {
    const baseline = clubModel(history, last.club);
    const today = roundShots.filter((s) => s.club === last.club && s.type !== "short_game");
    if (baseline.source === "personal" && today.length >= STREAK) {
      const drop = 1 - mean(today.map((s) => s.carryYards)) / baseline.meanCarry;
      if (drop >= 0.08) {
        insights.push({
          kind: "distance_drop",
          message: `Your ${clubName(last.club)} is going about ${Math.round(drop * 100)}% shorter than usual today. Club up with it for the rest of the round.`,
        });
      }
    }
  }

  return insights;
}

export const FAULT_LABEL: Record<SwingFault, string> = {
  over_the_top: "coming over the top",
  early_extension: "standing up through impact",
  fast_tempo: "rushing the backswing",
  slow_tempo: "a slow, stalled transition",
};

/** How many swings in a row (ending with the latest) share each fault. */
export function faultStreaks(swings: SwingAnalysis[]): Partial<Record<SwingFault, number>> {
  const out: Partial<Record<SwingFault, number>> = {};
  for (const fault of Object.keys(FAULT_LABEL) as SwingFault[]) {
    const run = trailingRun(swings, (s) => s.faults.includes(fault)).length;
    if (run > 0) out[fault] = run;
  }
  return out;
}

export function detectSwingPatterns(swings: SwingAnalysis[]): Insight[] {
  const streaks = faultStreaks(swings);
  return (Object.entries(streaks) as [SwingFault, number][])
    .filter(([, n]) => n >= STREAK)
    .map(([fault, n]) => ({
      kind: "recurring_swing_fault" as const,
      message: `You've been ${FAULT_LABEL[fault]} on ${n} swings in a row.`,
    }));
}
