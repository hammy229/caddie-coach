import { describe, expect, it } from "vitest";
import { handicapIndex, scoringAverage } from "../src/domain/handicap.js";
import type { Round } from "../src/domain/types.js";

let n = 0;
function round(strokes: number, extra: Partial<Round> = {}): Round {
  n++;
  return {
    id: `r${n}`,
    course: "Test",
    date: `2026-09-${String(n).padStart(2, "0")}`,
    risk: "normal",
    ended: true,
    strokes,
    par: 72,
    ...extra,
  };
}

describe("handicapIndex", () => {
  it("needs at least three scored rounds", () => {
    expect(handicapIndex([round(90), round(88)])).toBeNull();
  });

  it("uses the single lowest differential with an adjustment for three rounds", () => {
    // par 72, slope 113 => differential = score - 72; lowest is 16, adjust -2.
    const r = handicapIndex([round(90), round(88), round(92)]);
    expect(r?.index).toBeCloseTo(13.4, 1);
  });

  it("uses the lowest differential of five rounds", () => {
    const r = handicapIndex([round(90), round(88), round(92), round(85), round(95)]);
    expect(r?.index).toBeCloseTo(12.5, 1);
    expect(r?.roundsUsed).toBe(5);
  });

  it("prefers course rating and slope over par when given", () => {
    const r = handicapIndex([
      round(90, { rating: 70, slope: 125 }),
      round(88, { rating: 70, slope: 125 }),
      round(92, { rating: 70, slope: 125 }),
    ]);
    // Lowest differential = (88 - 70) * 113 / 125 = 16.27, adjust -2, * 0.96.
    expect(r?.index).toBeCloseTo(13.7, 1);
  });

  it("skips rounds with no score", () => {
    const noScore: Round = { id: "x", course: "T", date: "2026-08-01", risk: "normal", ended: true, par: 72 };
    expect(handicapIndex([noScore, round(90), round(88)])).toBeNull();
  });
});

describe("scoringAverage", () => {
  it("averages recent scored rounds", () => {
    expect(scoringAverage([round(90), round(88), round(92)])).toBe(90);
  });

  it("is null without scores", () => {
    expect(scoringAverage([])).toBeNull();
  });
});
