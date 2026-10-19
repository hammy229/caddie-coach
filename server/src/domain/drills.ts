import { bagModel } from "./dispersion.js";
import { FAULT_LABEL, faultStreaks } from "./patterns.js";
import { strokesGained } from "./strokesGained.js";
import type { SwingFault, UserState } from "./types.js";

/**
 * Turns everything the caddie has learned about a golfer into a focused practice
 * session. We score candidate drills against the player's own weaknesses - recurring
 * swing faults, the strokes-gained category costing them most, a biased tee shot - then
 * greedily fill the time they have, hardest-earned fixes first.
 */

export interface Drill {
  name: string;
  minutes: number;
  /** What this drill is trying to fix. */
  why: string;
  /** How to run the drill. */
  how: string;
}

export interface PracticePlan {
  totalMinutes: number;
  focus: string;
  drills: Drill[];
}

interface Candidate extends Drill {
  score: number;
}

const FAULT_DRILL: Record<SwingFault, Omit<Drill, "why">> = {
  over_the_top: {
    name: "Headcover gate",
    minutes: 10,
    how: "Set a headcover just outside the ball. Swing without clipping it so the club drops to the inside instead of over the top.",
  },
  early_extension: {
    name: "Wall drill",
    minutes: 10,
    how: "Set up with your backside grazing a chair or wall. Keep it in contact until after impact so your posture holds.",
  },
  fast_tempo: {
    name: "Three-to-one tempo",
    minutes: 8,
    how: "Count one-two-three going back, four coming down. Smooth out the rushed transition with slow half swings first.",
  },
  slow_tempo: {
    name: "Keep it moving",
    minutes: 8,
    how: "Make continuous swings with no pause at the top, feeling the club flow from backswing into downswing.",
  },
};

export function buildPracticePlan(state: UserState, minutes: number): PracticePlan {
  const candidates: Candidate[] = [];

  // 1. Recurring swing faults are the highest priority: groove the fix.
  const streaks = faultStreaks(state.swings);
  for (const [fault, run] of Object.entries(streaks) as [SwingFault, number][]) {
    if (run >= 2) {
      const d = FAULT_DRILL[fault];
      candidates.push({ ...d, why: `You've been ${FAULT_LABEL[fault]} ${run} swings in a row.`, score: 100 + run });
    }
  }

  // 2. The strokes-gained category costing the most.
  const sg = strokesGained(state.shots, state.putts);
  const puttAvg = sg.putts ? sg.putting / sg.putts : 0;
  const approachAvg = sg.approachShots ? sg.approach / sg.approachShots : 0;
  if (sg.putts >= 3 && puttAvg < -0.03) {
    candidates.push({
      name: "Gate putting",
      minutes: 12,
      why: `Putting is costing you about ${(-puttAvg).toFixed(2)} strokes a putt.`,
      how: "Two tees just wider than the putter: hole ten 3-footers in a row, then lag 20 to 30 footers to finish inside a towel.",
      score: 85,
    });
  }
  if (sg.approachShots >= 3 && approachAvg < -0.05) {
    candidates.push({
      name: "Distance ladder",
      minutes: 12,
      why: `Your approaches are losing about ${(-approachAvg).toFixed(2)} strokes each.`,
      how: "Hit wedges to 50, 70 and 90 yards, writing down the carries, until you can call your number before each shot.",
      score: 80,
    });
  }

  // 3. A one-sided tee shot the player has shown repeatedly.
  const driver = bagModel(state.shots).find((m) => m.club === "driver");
  if (driver && driver.source === "personal" && Math.abs(driver.meanLateral) >= 10) {
    const side = driver.meanLateral > 0 ? "right" : "left";
    candidates.push({
      name: "Alignment station",
      minutes: 10,
      why: `Your driver leaks about ${Math.round(Math.abs(driver.meanLateral))} yards ${side}.`,
      how: "Lay alignment sticks for your feet and the target line, then hit ten drivers checking the start line each time.",
      score: 70,
    });
  }

  // Always-useful fillers so a plan is never empty.
  candidates.push({
    name: "Up and down circuit",
    minutes: 10,
    why: "Scrambling saves the most strokes around the green.",
    how: "Drop nine balls around the green and try to get up and down from each, scoring yourself out of nine.",
    score: 40,
  });
  candidates.push({
    name: "Pre-shot routine",
    minutes: 5,
    why: "A repeatable routine transfers range form to the course.",
    how: "Rehearse the exact same pre-shot routine on ten range shots so it is automatic when it counts.",
    score: 20,
  });

  candidates.sort((a, b) => b.score - a.score);

  const drills: Drill[] = [];
  let used = 0;
  for (const c of candidates) {
    if (used + c.minutes > minutes) continue;
    drills.push({ name: c.name, minutes: c.minutes, why: c.why, how: c.how });
    used += c.minutes;
  }
  // Guarantee at least one drill even for a very short session.
  if (drills.length === 0 && candidates[0]) {
    const c = candidates[0];
    drills.push({ name: c.name, minutes: Math.min(c.minutes, minutes), why: c.why, how: c.how });
    used = Math.min(c.minutes, minutes);
  }

  return { totalMinutes: used, focus: drills[0]?.why ?? "General practice.", drills };
}
