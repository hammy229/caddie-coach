import { describe, expect, it } from "vitest";
import { detectShotPatterns, detectSwingPatterns, faultStreaks } from "../src/domain/patterns.js";
import type { SwingAnalysis, SwingFault } from "../src/domain/types.js";
import { shot } from "./fixtures.js";

function swing(faults: SwingFault[]): SwingAnalysis {
  return {
    id: "w",
    date: "2026-10-14",
    handed: "right",
    tempoRatio: 3,
    backswingMs: 750,
    downswingMs: 250,
    spineAngleChangeDeg: 0,
    outwardToDropRatio: 0,
    faults,
    reviewed: false,
  };
}

describe("detectShotPatterns", () => {
  it("flags three short approaches in a row", () => {
    const round = [shot("7i", 150, 140), shot("8i", 140, 128), shot("9i", 130, 121)];
    const insights = detectShotPatterns(round, []);
    expect(insights.map((i) => i.kind)).toContain("approaches_short");
    expect(insights[0]!.message).toContain("last 3 approach shots came up short");
  });

  it("stays quiet when the streak is broken", () => {
    const round = [shot("7i", 150, 140), shot("8i", 140, 141), shot("9i", 130, 121)];
    expect(detectShotPatterns(round, [])).toEqual([]);
  });

  it("flags repeated tee misses to one side", () => {
    const round = [1, 2, 3].map(() => shot("driver", 230, 230, 18, "tee"));
    expect(detectShotPatterns(round, []).map((i) => i.kind)).toContain("tee_miss_right");
  });

  it("notices a club going shorter than the player's history", () => {
    const history = [1, 2, 3, 4].map(() => shot("6i", 160, 160, 0, "approach", "old"));
    const today = [1, 2, 3].map(() => shot("6i", 160, 145, 0, "approach"));
    // Make the depth streak irrelevant by giving targets equal to carry.
    today.forEach((s) => (s.targetYards = s.carryYards));
    const kinds = detectShotPatterns(today, history).map((i) => i.kind);
    expect(kinds).toEqual(["distance_drop"]);
  });
});

describe("swing patterns", () => {
  it("counts trailing fault streaks", () => {
    const swings = [swing(["over_the_top"]), swing([]), swing(["over_the_top"]), swing(["over_the_top", "fast_tempo"])];
    expect(faultStreaks(swings)).toEqual({ over_the_top: 2, fast_tempo: 1 });
  });

  it("raises a recurring fault after three in a row", () => {
    const swings = [1, 2, 3].map(() => swing(["early_extension"]));
    expect(detectSwingPatterns(swings)[0]?.message).toContain("standing up through impact on 3 swings");
  });
});
