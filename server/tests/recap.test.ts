import { describe, expect, it } from "vitest";
import { buildRoundReport, templateRecap } from "../src/domain/report.js";
import type { Round, UserState } from "../src/domain/types.js";
import { shot } from "./fixtures.js";

const round: Round = { id: "r1", course: "Butler Park", date: "2026-10-17", risk: "normal", ended: true };

function report(shots: UserState["shots"], r: Round = round) {
  const state: UserState = { risk: "normal", activeRoundId: null, rounds: [r], swings: [], shots };
  return buildRoundReport(state, r);
}

describe("dominantMiss", () => {
  it("is null when every miss is inside the four-yard threshold", () => {
    const r = report([
      shot("7i", 150, 151, 1, "approach", "r1"),
      shot("7i", 150, 149, -2, "approach", "r1"),
    ]);
    expect(r.dominantMiss).toBeNull();
  });

  it("reports a lateral miss when sideways beats depth", () => {
    const r = report([
      shot("7i", 150, 150, 10, "approach", "r1"),
      shot("7i", 150, 151, 12, "approach", "r1"),
      shot("7i", 150, 149, 11, "approach", "r1"),
    ]);
    expect(r.dominantMiss).toBe("right");
  });
});

describe("templateRecap", () => {
  it("omits strokes, fairways and approaches when there is no data for them", () => {
    // A round with only short-game shots: no strokes, no tee shots, no approaches.
    const r = report([shot("sw", 30, 30, 0, "short_game", "r1")]);
    expect(templateRecap(r)).toBe("Round at Butler Park.");
  });

  it("includes the strokes when the round is scored", () => {
    const scored: Round = { ...round, strokes: 82 };
    const r = report([shot("driver", 230, 230, 2, "tee", "r1")], scored);
    expect(templateRecap(r)).toContain("you shot 82");
    expect(templateRecap(r)).toContain("1 of 1 fairways");
  });
});
