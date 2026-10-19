import { bagModel, type ClubModel } from "./dispersion.js";
import { recommendClub, type Trouble } from "./recommend.js";
import type { Club, Risk, Shot } from "./types.js";

/**
 * Plans a hole the way a caddie would: work backwards from a comfortable approach
 * distance, pick a tee shot that leaves it, and only take on a hazard or a par-5 green
 * in two when the golfer's risk appetite and their own distances justify it.
 */

export interface HoleConditions {
  par: 3 | 4 | 5;
  holeYards: number;
  /** Carry needed to clear a hazard off the tee, if any. */
  carryHazardYards?: number;
  trouble?: Trouble;
}

export interface PlannedShot {
  number: number;
  club: Club;
  targetYards: number;
  note: string;
}

export interface HolePlan {
  par: number;
  holeYards: number;
  shots: PlannedShot[];
  summary: string;
}

/** Distance we'd like to leave for the approach, by appetite: safe leaves a wedge. */
const PREFERRED_APPROACH: Record<Risk, number> = { safe: 110, normal: 130, aggressive: 150 };

const longestClub = (models: ClubModel[]): ClubModel =>
  models.reduce((a, b) => (b.meanCarry > a.meanCarry ? b : a));

/** The club whose average carry is closest to a target distance. */
function clubForCarry(models: ClubModel[], target: number): ClubModel {
  return models.reduce((best, m) =>
    Math.abs(m.meanCarry - target) < Math.abs(best.meanCarry - target) ? m : best,
  );
}

function approachShot(shots: Shot[], number: number, distance: number, risk: Risk, trouble: Trouble): PlannedShot {
  const rec = recommendClub(shots, { distanceYards: Math.max(20, Math.round(distance)), trouble }, risk);
  const aim =
    rec.aimYards === 0 ? "aim at the pin" : `aim ${Math.abs(rec.aimYards)} yds ${rec.aimYards < 0 ? "left" : "right"}`;
  return { number, club: rec.club, targetYards: Math.round(distance), note: `into the green, ${aim}` };
}

export function planHole(shots: Shot[], c: HoleConditions, risk: Risk): HolePlan {
  const models = bagModel(shots);
  const driver = models.find((m) => m.club === "driver")!;
  const wantApproach = PREFERRED_APPROACH[risk];
  const trouble = c.trouble ?? "none";
  const plan: PlannedShot[] = [];

  if (c.par === 3) {
    plan.push(approachShot(shots, 1, c.holeYards, risk, trouble));
  } else if (c.par === 4) {
    // Driver unless it would leave an awkward little pitch; then club down to leave a full swing.
    const afterDriver = c.holeYards - driver.meanCarry;
    let tee = driver;
    if (risk !== "aggressive" && afterDriver < wantApproach - 25) {
      tee = clubForCarry(models, c.holeYards - wantApproach);
    }
    const remaining = c.holeYards - tee.meanCarry;
    const teeNote =
      c.carryHazardYards && c.carryHazardYards > tee.meanCarry
        ? `lay back short of the hazard`
        : tee.club === "driver"
          ? "let the driver go"
          : `${tee.club} to leave a full swing in`;
    plan.push({ number: 1, club: tee.club, targetYards: Math.round(tee.meanCarry), note: teeNote });
    plan.push(approachShot(shots, 2, remaining, risk, trouble));
  } else {
    // Par 5: driver off the tee, then decide to go for it or lay up to a number.
    plan.push({ number: 1, club: driver.club, targetYards: Math.round(driver.meanCarry), note: "let the driver go" });
    const afterTee = c.holeYards - driver.meanCarry;
    const longWood = longestClub(models.filter((m) => m.club !== "driver"));
    const reachable = afterTee <= longWood.meanCarry + 10;
    if (risk === "aggressive" && reachable) {
      plan.push({ number: 2, club: longWood.club, targetYards: Math.round(afterTee), note: "go for the green" });
    } else {
      const layupCarry = afterTee - wantApproach;
      const layup = clubForCarry(models, layupCarry);
      plan.push({ number: 2, club: layup.club, targetYards: Math.round(layup.meanCarry), note: `lay up, leave ${wantApproach} in` });
      plan.push(approachShot(shots, 3, c.holeYards - driver.meanCarry - layup.meanCarry, risk, trouble));
    }
  }

  const summary = plan
    .map((s) => `${s.number === 1 ? "Off the tee" : s.number === plan.length ? "Then" : "Next"}, ${s.club} (${s.note}).`)
    .join(" ");
  return { par: c.par, holeYards: c.holeYards, shots: plan, summary };
}
