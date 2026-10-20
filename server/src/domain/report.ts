import { mean, round1 } from "./stats.js";
import { strokesGained } from "./strokesGained.js";
import { clubName, type Club, type Round, type Shot, type SwingFault, type UserState } from "./types.js";

export interface ClubTrend {
  club: Club;
  todayCarry: number;
  usualCarry: number | null;
}

export interface RoundReport {
  roundId: string;
  course: string;
  date: string;
  strokes: number | null;
  shotsLogged: number;
  fairwaysHit: number;
  teeShots: number;
  greensHit: number;
  approaches: number;
  /** Signed: negative = short, positive = long. */
  avgApproachDepthMiss: number | null;
  /** Signed: negative = left, positive = right. */
  avgLateralMiss: number | null;
  dominantMiss: "short" | "long" | "left" | "right" | null;
  clubTrends: ClubTrend[];
  swingFaults: SwingFault[];
  /** Strokes gained versus the tour benchmark, from logged approaches and putts. */
  strokesGained: { approach: number; putting: number; total: number };
  putts: number;
  puttsHoled: number;
  vsPrior: {
    rounds: number;
    fairwayPct: number | null;
    greenPct: number | null;
    priorFairwayPct: number | null;
    priorGreenPct: number | null;
  };
  strengths: string[];
  weaknesses: string[];
}

const FAIRWAY_WIDTH = 15;
const GREEN_RADIUS = 10;

const isFairway = (s: Shot) => Math.abs(s.lateralYards) <= FAIRWAY_WIDTH;
const isGreen = (s: Shot) =>
  Math.abs(s.carryYards - s.targetYards) <= GREEN_RADIUS && Math.abs(s.lateralYards) <= GREEN_RADIUS;

const pct = (hit: number, total: number): number | null =>
  total === 0 ? null : Math.round((hit / total) * 100);

function rates(shots: Shot[]) {
  const tees = shots.filter((s) => s.type === "tee");
  const apps = shots.filter((s) => s.type === "approach");
  return {
    tees,
    apps,
    fairways: tees.filter(isFairway).length,
    greens: apps.filter(isGreen).length,
  };
}

export function buildRoundReport(state: UserState, round: Round): RoundReport {
  const shots = state.shots.filter((s) => s.roundId === round.id);
  const roundPutts = state.putts.filter((p) => p.roundId === round.id);
  const sg = strokesGained(shots, roundPutts);
  const prior = state.rounds.filter((r) => r.id !== round.id && r.ended && r.date <= round.date);
  const priorShots = state.shots.filter((s) => s.roundId && prior.some((r) => r.id === s.roundId));

  const now = rates(shots);
  const before = rates(priorShots);

  const depthMiss = now.apps.length ? round1(mean(now.apps.map((s) => s.carryYards - s.targetYards))) : null;
  const fullSwings = shots.filter((s) => s.type !== "short_game");
  const lateralMiss = fullSwings.length ? round1(mean(fullSwings.map((s) => s.lateralYards))) : null;

  let dominantMiss: RoundReport["dominantMiss"] = null;
  const depthMag = Math.abs(depthMiss ?? 0);
  const latMag = Math.abs(lateralMiss ?? 0);
  if (Math.max(depthMag, latMag) >= 4) {
    dominantMiss =
      depthMag >= latMag
        ? (depthMiss ?? 0) < 0 ? "short" : "long"
        : (lateralMiss ?? 0) < 0 ? "left" : "right";
  }

  const clubs = [...new Set(fullSwings.map((s) => s.club))];
  const clubTrends: ClubTrend[] = clubs.map((club) => {
    const today = fullSwings.filter((s) => s.club === club).map((s) => s.carryYards);
    const usual = priorShots.filter((s) => s.club === club && s.type !== "short_game").map((s) => s.carryYards);
    return {
      club,
      todayCarry: Math.round(mean(today)),
      usualCarry: usual.length >= 3 ? Math.round(mean(usual)) : null,
    };
  });

  const swingFaults = [
    ...new Set(state.swings.filter((s) => s.date === round.date).flatMap((s) => s.faults)),
  ];

  const fairwayPct = pct(now.fairways, now.tees.length);
  const greenPct = pct(now.greens, now.apps.length);
  const priorFairwayPct = pct(before.fairways, before.tees.length);
  const priorGreenPct = pct(before.greens, before.apps.length);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (fairwayPct !== null) {
    if (fairwayPct >= 60) strengths.push(`Driving: ${fairwayPct}% of tee shots in play.`);
    else weaknesses.push(`Driving: only ${fairwayPct}% of tee shots in play.`);
  }
  if (greenPct !== null) {
    if (greenPct >= 50) strengths.push(`Approaches: ${greenPct}% finished within ${GREEN_RADIUS} yards.`);
    else weaknesses.push(`Approaches: ${greenPct}% finished within ${GREEN_RADIUS} yards.`);
  }
  if (sg.approachShots >= 3) {
    if (sg.approach >= 0.5) strengths.push(`Approaches: +${sg.approach} strokes gained versus the benchmark.`);
    else if (sg.approach <= -0.5) weaknesses.push(`Approaches: ${sg.approach} strokes versus the benchmark.`);
  }
  if (sg.putts >= 3) {
    if (sg.putting >= 0.5) strengths.push(`Putting: +${sg.putting} strokes gained on the greens.`);
    else if (sg.putting <= -0.5) weaknesses.push(`Putting: ${sg.putting} strokes on the greens.`);
  }
  if (dominantMiss) weaknesses.push(`Your typical miss today was ${dominantMiss}.`);
  for (const t of clubTrends) {
    if (t.usualCarry && t.todayCarry < t.usualCarry * 0.93) {
      weaknesses.push(`${clubName(t.club)} carried ${t.usualCarry - t.todayCarry} yards shorter than usual.`);
    }
  }
  if (fairwayPct !== null && priorFairwayPct !== null && fairwayPct > priorFairwayPct) {
    strengths.push(`Fairways up from ${priorFairwayPct}% in earlier rounds.`);
  }
  if (greenPct !== null && priorGreenPct !== null && greenPct > priorGreenPct) {
    strengths.push(`Approach accuracy up from ${priorGreenPct}% in earlier rounds.`);
  }

  return {
    roundId: round.id,
    course: round.course,
    date: round.date,
    strokes: round.strokes ?? null,
    shotsLogged: shots.length,
    fairwaysHit: now.fairways,
    teeShots: now.tees.length,
    greensHit: now.greens,
    approaches: now.apps.length,
    avgApproachDepthMiss: depthMiss,
    avgLateralMiss: lateralMiss,
    dominantMiss,
    clubTrends,
    swingFaults,
    strokesGained: { approach: sg.approach, putting: sg.putting, total: sg.total },
    putts: roundPutts.length,
    puttsHoled: roundPutts.filter((p) => p.holed).length,
    vsPrior: { rounds: prior.length, fairwayPct, greenPct, priorFairwayPct, priorGreenPct },
    strengths,
    weaknesses,
  };
}

/** Deterministic spoken recap; the Bedrock narrator falls back to this. */
export function templateRecap(r: RoundReport): string {
  const parts = [`Round at ${r.course}${r.strokes ? `, you shot ${r.strokes}` : ""}.`];
  if (r.teeShots) parts.push(`You hit ${r.fairwaysHit} of ${r.teeShots} fairways.`);
  if (r.approaches) parts.push(`${r.greensHit} of ${r.approaches} approaches finished close.`);
  if (r.putts >= 3) parts.push(`You putted ${r.strokesGained.putting >= 0 ? "+" : ""}${r.strokesGained.putting} strokes versus the benchmark.`);
  if (r.strengths[0]) parts.push(`Best part: ${r.strengths[0]}`);
  if (r.weaknesses[0]) parts.push(`Work on: ${r.weaknesses[0]}`);
  return parts.join(" ");
}
