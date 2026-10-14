import { round1 } from "./stats.js";
import type { Handedness, SwingFault } from "./types.js";

/** Normalized image coordinates (0-1), y grows downward, as produced by pose estimators. */
export interface Point {
  x: number;
  y: number;
}

export interface PoseFrame {
  /** Milliseconds since capture start. */
  t: number;
  leftShoulder: Point;
  rightShoulder: Point;
  leftHip: Point;
  rightHip: Point;
  leftWrist: Point;
  rightWrist: Point;
}

export interface SwingMetrics {
  backswingMs: number;
  downswingMs: number;
  tempoRatio: number;
  spineAngleChangeDeg: number;
  outwardToDropRatio: number;
  faults: SwingFault[];
}

export class SwingAnalysisError extends Error {}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

const hands = (f: PoseFrame) => mid(f.leftWrist, f.rightWrist);
const hipMid = (f: PoseFrame) => mid(f.leftHip, f.rightHip);
const shoulderMid = (f: PoseFrame) => mid(f.leftShoulder, f.rightShoulder);

/** Forward tilt of the spine (hips -> shoulders) from vertical, in degrees. */
function spineTilt(f: PoseFrame): number {
  const h = hipMid(f);
  const s = shoulderMid(f);
  return (Math.atan2(Math.abs(s.x - h.x), h.y - s.y) * 180) / Math.PI;
}

/**
 * Heuristic swing analysis from 2D pose keypoints (camera facing or behind the player).
 *
 * - Tempo: takeaway -> top of backswing (hands highest) -> impact (hands back near address).
 *   Good players sit near 3:1.
 * - Early extension: the spine loses forward tilt between address and impact.
 * - Over the top: early in the downswing the hands move away from the body more than they drop.
 */
export function analyzeSwing(frames: PoseFrame[], _handed: Handedness = "right"): SwingMetrics {
  if (frames.length < 10) throw new SwingAnalysisError("Need at least 10 pose frames.");
  const sorted = [...frames].sort((a, b) => a.t - b.t);
  const address = sorted[0]!;
  const torso = dist(hipMid(address), shoulderMid(address));
  if (torso < 0.02) throw new SwingAnalysisError("Player is too small in frame.");

  const addressHands = hands(address);
  const takeawayIdx = sorted.findIndex((f) => dist(hands(f), addressHands) > 0.05 * torso);
  if (takeawayIdx < 0) throw new SwingAnalysisError("No swing motion detected.");

  let topIdx = takeawayIdx;
  for (let i = takeawayIdx; i < sorted.length; i++) {
    if (hands(sorted[i]!).y < hands(sorted[topIdx]!).y) topIdx = i;
  }
  if (topIdx >= sorted.length - 2) throw new SwingAnalysisError("Capture ended before the downswing.");

  // Impact: first frame after the top where the hands are back down at address height.
  let impactIdx = sorted.findIndex(
    (f, i) => i > topIdx && hands(f).y >= addressHands.y - 0.1 * torso,
  );
  if (impactIdx < 0) {
    impactIdx = topIdx + 1;
    for (let i = topIdx + 1; i < sorted.length; i++) {
      if (hands(sorted[i]!).y > hands(sorted[impactIdx]!).y) impactIdx = i;
    }
  }

  const takeaway = sorted[takeawayIdx]!;
  const top = sorted[topIdx]!;
  const impact = sorted[impactIdx]!;
  const backswingMs = top.t - takeaway.t;
  const downswingMs = Math.max(1, impact.t - top.t);
  const tempoRatio = backswingMs / downswingMs;

  const spineAngleChangeDeg = spineTilt(address) - spineTilt(impact);

  // Transition window: the first third of the downswing.
  const earlyIdx = Math.max(topIdx + 1, topIdx + Math.round((impactIdx - topIdx) / 3));
  const early = sorted[Math.min(earlyIdx, impactIdx)]!;
  const outward =
    (Math.abs(hands(early).x - hipMid(early).x) - Math.abs(hands(top).x - hipMid(top).x)) / torso;
  const drop = (hands(early).y - hands(top).y) / torso;
  const outwardToDropRatio = drop > 0.01 ? outward / drop : outward > 0 ? 10 : 0;

  const faults: SwingFault[] = [];
  if (outward > 0.05 && outwardToDropRatio > 0.5) faults.push("over_the_top");
  if (spineAngleChangeDeg > 8) faults.push("early_extension");
  if (tempoRatio < 2.3) faults.push("fast_tempo");
  if (tempoRatio > 4.2) faults.push("slow_tempo");

  return {
    backswingMs: Math.round(backswingMs),
    downswingMs: Math.round(downswingMs),
    tempoRatio: round1(tempoRatio),
    spineAngleChangeDeg: round1(spineAngleChangeDeg),
    outwardToDropRatio: round1(outwardToDropRatio),
    faults,
  };
}
