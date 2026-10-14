import type { PoseFrame, Point } from "../src/domain/swing.js";
import type { Club, Shot, ShotType } from "../src/domain/types.js";

let n = 0;
export function shot(
  club: Club,
  targetYards: number,
  carryYards: number,
  lateralYards = 0,
  type: ShotType = "approach",
  roundId: string | null = "r1",
  date = "2026-10-14",
): Shot {
  n++;
  return { id: `s${n}`, roundId, club, type, targetYards, carryYards, lateralYards, date };
}

export interface SwingOptions {
  backswingMs?: number;
  downswingMs?: number;
  /** Hands move this far away from the body (x) at the start of the downswing. */
  overTheTop?: boolean;
  /** Shoulders rise to vertical over the hips at impact. */
  earlyExtension?: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/**
 * Synthetic face-on swing at 60 fps: hold at address, backswing to the top, downswing to impact.
 * Hips at x=0.5. Address shoulders tilt toward the ball (x=0.44), which gives roughly 17 degrees of spine tilt.
 */
export function syntheticSwing(opts: SwingOptions = {}): PoseFrame[] {
  const back = opts.backswingMs ?? 750;
  const down = opts.downswingMs ?? 250;
  const dt = 1000 / 60;
  const hip: Point = { x: 0.5, y: 0.55 };
  const shoulderAddress: Point = { x: 0.44, y: 0.35 };
  const shoulderImpact: Point = opts.earlyExtension ? { x: 0.5, y: 0.34 } : shoulderAddress;
  const handsAddress: Point = { x: 0.46, y: 0.7 };
  const handsTop: Point = { x: 0.36, y: 0.22 };
  // Over the top: hands throw outward (away from the hips) while barely dropping.
  const handsTransition: Point = opts.overTheTop ? { x: 0.22, y: 0.27 } : { x: 0.4, y: 0.4 };

  const frames: PoseFrame[] = [];
  const total = 200 + back + down + 100;
  for (let t = 0; t <= total; t += dt) {
    let h: Point;
    let s: Point;
    if (t < 200) {
      h = handsAddress;
      s = shoulderAddress;
    } else if (t < 200 + back) {
      const p = (t - 200) / back;
      h = lerpP(handsAddress, handsTop, Math.sin((p * Math.PI) / 2));
      s = shoulderAddress;
    } else if (t < 200 + back + down) {
      const p = (t - 200 - back) / down;
      h = p < 1 / 3 ? lerpP(handsTop, handsTransition, p * 3) : lerpP(handsTransition, handsAddress, (p - 1 / 3) * 1.5);
      s = lerpP(shoulderAddress, shoulderImpact, p);
    } else {
      h = handsAddress;
      s = shoulderImpact;
    }
    frames.push({
      t: Math.round(t),
      leftShoulder: { x: s.x - 0.08, y: s.y },
      rightShoulder: { x: s.x + 0.08, y: s.y },
      leftHip: { x: hip.x - 0.06, y: hip.y },
      rightHip: { x: hip.x + 0.06, y: hip.y },
      leftWrist: { x: h.x - 0.01, y: h.y },
      rightWrist: { x: h.x + 0.01, y: h.y },
    });
  }
  return frames;
}
