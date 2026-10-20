import { bagModel, type ClubModel } from "./dispersion.js";
import { normalCdf, round1 } from "./stats.js";
import { clubName, type Club, type Risk, type Shot } from "./types.js";

export type Wind = "none" | "head" | "tail" | "left_to_right" | "right_to_left";
export type Trouble = "none" | "short" | "long";

export interface Conditions {
  distanceYards: number;
  wind?: Wind;
  windMph?: number;
  /** Positive = target is uphill. */
  elevationFeet?: number;
  trouble?: Trouble;
  /** Front-to-back depth of the target area. */
  targetDepthYards?: number;
}

export interface ClubOption {
  club: Club;
  probOnTarget: number;
  probInTrouble: number;
  score: number;
  source: ClubModel["source"];
}

export interface Recommendation {
  playsLikeYards: number;
  club: Club;
  probOnTarget: number;
  /** Signed aim offset in yards: negative = aim left of target, positive = aim right. */
  aimYards: number;
  alternatives: ClubOption[];
  reasons: string[];
}

/** Rule-of-thumb distance adjustments. Headwind hurts about twice as much as tailwind helps. */
export function playsLike(c: Conditions): number {
  const mph = c.windMph ?? 0;
  let d = c.distanceYards;
  if (c.wind === "head") d *= 1 + 0.01 * mph;
  if (c.wind === "tail") d *= 1 - 0.005 * mph;
  d += (c.elevationFeet ?? 0) / 3;
  return Math.round(d);
}

/** Crosswind drift in yards; positive = ball moves right. */
export function crosswindDrift(c: Conditions, yards: number): number {
  const mph = c.windMph ?? 0;
  const drift = (mph * yards) / 200;
  if (c.wind === "left_to_right") return drift;
  if (c.wind === "right_to_left") return -drift;
  return 0;
}

const TROUBLE_WEIGHT: Record<Risk, number> = { safe: 2, normal: 1, aggressive: 0.35 };

export function recommendClub(shots: Shot[], c: Conditions, risk: Risk): Recommendation {
  const target = playsLike(c);
  const half = (c.targetDepthYards ?? 20) / 2;
  const trouble = c.trouble ?? "none";

  const options: ClubOption[] = bagModel(shots).map((m) => {
    const zLow = (target - half - m.meanCarry) / m.sdCarry;
    const zHigh = (target + half - m.meanCarry) / m.sdCarry;
    const probOnTarget = normalCdf(zHigh) - normalCdf(zLow);
    const probInTrouble =
      trouble === "short" ? normalCdf(zLow) : trouble === "long" ? 1 - normalCdf(zHigh) : 0;
    let score = probOnTarget - TROUBLE_WEIGHT[risk] * probInTrouble;
    // Aggressive players would rather be long than short: being past the pin keeps the hole in play.
    if (risk === "aggressive" && trouble === "none") score += 0.1 * (1 - normalCdf(zLow));
    return { club: m.club, probOnTarget, probInTrouble, score, source: m.source };
  });

  options.sort((a, b) => b.score - a.score);
  const best = options[0]!;
  const model = bagModel(shots).find((m) => m.club === best.club)!;

  const drift = crosswindDrift(c, target);
  const aimYards = Math.round(-(model.meanLateral + drift));

  const reasons: string[] = [];
  if (target !== c.distanceYards) {
    reasons.push(`It plays like ${target} yards instead of ${c.distanceYards}.`);
  }
  reasons.push(
    model.source === "personal"
      ? `Your ${clubName(best.club)} has carried ${Math.round(model.meanCarry)} yards on average, give or take ${Math.round(model.sdCarry)}.`
      : `I don't have enough of your ${clubName(best.club)} shots yet, so I'm using a typical ${Math.round(model.meanCarry)} yards.`,
  );
  if (Math.abs(model.meanLateral) >= 3) {
    reasons.push(
      `You tend to miss ${Math.round(Math.abs(model.meanLateral))} yards ${model.meanLateral > 0 ? "right" : "left"} with it.`,
    );
  }
  if (trouble !== "none") {
    reasons.push(
      `With trouble ${trouble} and ${risk === "aggressive" ? "an" : "a"} ${risk} game plan, there's about a ${Math.round(best.probInTrouble * 100)}% chance of finding it.`,
    );
  }

  return {
    playsLikeYards: target,
    club: best.club,
    probOnTarget: round1(best.probOnTarget * 100) / 100,
    aimYards,
    alternatives: options.slice(1, 3),
    reasons,
  };
}
