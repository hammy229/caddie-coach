import { describe, expect, it } from "vitest";
import { BedrockNarrator } from "../src/domain/narrator.js";
import { buildRoundReport, templateRecap } from "../src/domain/report.js";
import type { Putt, Round, UserState } from "../src/domain/types.js";
import { shot } from "./fixtures.js";

const old: Round = { id: "old", course: "Lions", date: "2026-10-01", risk: "normal", ended: true };
const today: Round = { id: "r1", course: "Butler Park", date: "2026-10-14", risk: "normal", ended: true, strokes: 84 };

function state(): UserState {
  return {
    risk: "normal",
    activeRoundId: null,
    rounds: [old, today],
    putts: [],
    swings: [],
    shots: [
      // Earlier round: 1 of 4 fairways, 7i usually 150.
      shot("driver", 230, 230, 25, "tee", "old"),
      shot("driver", 230, 230, -20, "tee", "old"),
      shot("driver", 230, 230, 30, "tee", "old"),
      shot("driver", 230, 230, 5, "tee", "old"),
      shot("7i", 150, 150, 0, "approach", "old"),
      shot("7i", 150, 151, 0, "approach", "old"),
      shot("7i", 150, 149, 0, "approach", "old"),
      // Today: 3 of 4 fairways, approaches short.
      shot("driver", 230, 232, 4, "tee", "r1"),
      shot("driver", 230, 228, -6, "tee", "r1"),
      shot("driver", 230, 230, 22, "tee", "r1"),
      shot("driver", 230, 231, 2, "tee", "r1"),
      shot("7i", 150, 136, 2, "approach", "r1"),
      shot("7i", 150, 135, -1, "approach", "r1"),
      shot("7i", 150, 138, 0, "approach", "r1"),
    ],
  };
}

describe("buildRoundReport", () => {
  const r = buildRoundReport(state(), today);

  it("counts fairways and close approaches", () => {
    expect(r.fairwaysHit).toBe(3);
    expect(r.teeShots).toBe(4);
    expect(r.greensHit).toBe(0);
    expect(r.approaches).toBe(3);
  });

  it("identifies the dominant miss and compares to earlier rounds", () => {
    expect(r.dominantMiss).toBe("short");
    expect(r.vsPrior.priorFairwayPct).toBe(25);
    expect(r.vsPrior.fairwayPct).toBe(75);
    expect(r.strengths.join(" ")).toContain("Fairways up from 25%");
    expect(r.weaknesses.join(" ")).toContain("7 iron carried 14 yards shorter than usual");
  });

  it("produces a spoken template recap", () => {
    const text = templateRecap(r);
    expect(text).toContain("you shot 84");
    expect(text).toContain("3 of 4 fairways");
  });
});

describe("putting in the round report", () => {
  const putt = (distanceFeet: number, holed: boolean, remainingFeet = 0): Putt => ({
    id: `p${distanceFeet}`, roundId: "r1", distanceFeet, holed, remainingFeet, date: "2026-10-14",
  });

  it("counts putts and surfaces positive putting strokes gained", () => {
    const s = state();
    s.putts = [putt(25, true), putt(18, true), putt(30, true)];
    const r = buildRoundReport(s, today);
    expect(r.putts).toBe(3);
    expect(r.puttsHoled).toBe(3);
    expect(r.strokesGained.putting).toBeGreaterThan(0);
    expect(r.strengths.join(" ")).toContain("strokes gained on the greens");
    expect(templateRecap(r)).toContain("versus the benchmark");
  });
});

describe("BedrockNarrator", () => {
  const report = buildRoundReport(state(), today);
  const client = (send: () => Promise<unknown>) => ({ send }) as never;

  it("returns the model's recap", async () => {
    const reply = { output: { message: { content: [{ text: "Great driving today." }] } } };
    const n = new BedrockNarrator("m", client(async () => reply));
    expect(await n.recap(report)).toBe("Great driving today.");
  });

  it("falls back to the template when Bedrock fails", async () => {
    const n = new BedrockNarrator("m", client(async () => { throw new Error("denied"); }));
    expect(await n.recap(report)).toContain("3 of 4 fairways");
  });
});
