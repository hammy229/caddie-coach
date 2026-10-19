import type { Putt, Shot } from "./types.js";

/**
 * Strokes gained, the way modern golf measures performance.
 *
 * Every position on the course has a benchmark "expected strokes to hole out" for a
 * tour-level player. A shot's strokes gained is how much it improved that expectation:
 *
 *   gained = expectedBefore - expectedAfter - 1
 *
 * A positive number means the shot beat the benchmark. The baselines below are the PGA
 * Tour averages popularised by Mark Broadie ("Every Shot Counts"): putting indexed by
 * feet, long shots indexed by yards and lie. We interpolate linearly between points.
 *
 * We track the two categories we can derive from what the golfer actually logs:
 *   - approach: inferred proximity to the pin after a logged approach shot
 *   - putting: distance before and after each logged putt
 */

export type Lie = "tee" | "fairway" | "rough" | "sand";

type Table = ReadonlyArray<readonly [number, number]>;

/** Expected putts to hole out from a given distance in feet (on the green). */
const GREEN: Table = [
  [2, 1.01], [3, 1.04], [4, 1.13], [5, 1.23], [6, 1.34], [7, 1.42], [8, 1.5],
  [9, 1.56], [10, 1.61], [12, 1.7], [15, 1.78], [20, 1.87], [25, 1.94],
  [30, 2.0], [40, 2.09], [50, 2.17], [60, 2.23], [90, 2.4],
];

/** Expected strokes to hole out from a given distance in yards, by lie. */
const GRASS: Record<Lie, Table> = {
  fairway: [
    [10, 2.18], [20, 2.4], [30, 2.52], [40, 2.6], [50, 2.66], [60, 2.7],
    [70, 2.72], [80, 2.75], [90, 2.77], [100, 2.8], [120, 2.85], [140, 2.91],
    [160, 2.98], [180, 3.08], [200, 3.19], [220, 3.32], [240, 3.45], [260, 3.58],
  ],
  rough: [
    [20, 2.59], [40, 2.78], [60, 2.91], [80, 2.96], [100, 3.02], [120, 3.08],
    [140, 3.15], [160, 3.23], [180, 3.34], [200, 3.46], [220, 3.6],
  ],
  sand: [
    [10, 2.43], [20, 2.53], [30, 2.66], [40, 2.82], [50, 2.92], [60, 3.0],
    [80, 3.06], [100, 3.1], [120, 3.16],
  ],
  tee: [
    [100, 2.92], [150, 2.99], [200, 3.2], [250, 3.45], [300, 3.71], [350, 3.87],
    [400, 4.0], [450, 4.12], [500, 4.22], [550, 4.33], [600, 4.45],
  ],
};

/** Linear interpolation into a sorted [distance, value] table, clamped at both ends. */
function lookup(table: Table, x: number): number {
  const first = table[0]!;
  const last = table[table.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]!;
    if (x <= x1) {
      const [x0, y0] = table[i - 1]!;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return last[1];
}

export function expectedPutts(feet: number): number {
  if (feet <= 0.5) return 1;
  return lookup(GREEN, feet);
}

export function expectedStrokes(yards: number, lie: Lie): number {
  return lookup(GRASS[lie], yards);
}

/** Distance from the pin after a shot, inferred from its carry and lateral miss (yards). */
export function proximityYards(shot: Shot): number {
  return Math.hypot(shot.carryYards - shot.targetYards, shot.lateralYards);
}

/** Within this many yards of the pin we treat an approach as finishing on the green. */
const ON_GREEN_YARDS = 10;

/** Expected strokes to hole out from an approach's resulting position. */
export function expectedAfterApproach(proximity: number): number {
  if (proximity <= 0.5) return 0;
  return proximity <= ON_GREEN_YARDS
    ? expectedPutts(proximity * 3)
    : expectedStrokes(proximity, "fairway");
}

/**
 * Strokes gained on one approach shot, assuming it was played from the fairway.
 * We don't know the real lie, so this is an estimate labelled as such to the golfer.
 */
export function approachStrokesGained(shot: Shot): number {
  const before = expectedStrokes(shot.targetYards, "fairway");
  const after = expectedAfterApproach(proximityYards(shot));
  return round2(before - after - 1);
}

/** Strokes gained on one putt. A holed putt leaves zero expected strokes behind. */
export function puttStrokesGained(putt: Putt): number {
  const before = expectedPutts(putt.distanceFeet);
  const after = putt.holed ? 0 : expectedPutts(putt.remainingFeet);
  return round2(before - after - 1);
}

export interface StrokesGained {
  approach: number;
  putting: number;
  total: number;
  approachShots: number;
  putts: number;
}

/** Total strokes gained across the approach shots and putts provided. */
export function strokesGained(shots: Shot[], putts: Putt[]): StrokesGained {
  const approaches = shots.filter((s) => s.type === "approach");
  const approach = round2(approaches.reduce((sum, s) => sum + approachStrokesGained(s), 0));
  const putting = round2(putts.reduce((sum, p) => sum + puttStrokesGained(p), 0));
  return {
    approach,
    putting,
    total: round2(approach + putting),
    approachShots: approaches.length,
    putts: putts.length,
  };
}

const round2 = (x: number): number => Math.round(x * 100) / 100;
