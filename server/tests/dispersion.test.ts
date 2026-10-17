import { describe, expect, it } from "vitest";
import { bagModel, clubModel, MIN_PERSONAL_SHOTS } from "../src/domain/dispersion.js";
import { CLUBS, DEFAULT_CARRY } from "../src/domain/types.js";
import { shot } from "./fixtures.js";

describe("bagModel", () => {
  it("returns one model for every club in the bag", () => {
    const models = bagModel([]);
    expect(models).toHaveLength(CLUBS.length);
    expect(models.map((m) => m.club)).toEqual([...CLUBS]);
  });

  it("falls back to default distances with no history", () => {
    for (const m of bagModel([])) {
      expect(m.source).toBe("default");
      expect(m.meanCarry).toBe(DEFAULT_CARRY[m.club]);
    }
  });
});

describe("clubModel default path", () => {
  it("floors the spread so a short club never looks implausibly tight", () => {
    const lw = clubModel([], "lw"); // 70 yard carry: 7% is 4.9, floor is 5.
    expect(lw.sdCarry).toBe(5);
    expect(lw.sdLateral).toBeCloseTo(70 * 0.06, 6); // 4.2 clears the floor of 4.
  });

  it("reports how many shots it has even while using defaults", () => {
    const m = clubModel([shot("7i", 150, 140), shot("7i", 150, 142)], "7i");
    expect(m.source).toBe("default");
    expect(m.shots).toBe(MIN_PERSONAL_SHOTS - 1);
  });
});

describe("clubModel recent window", () => {
  it("learns only from the most recent twenty shots", () => {
    const stale = [shot("7i", 150, 300)]; // one wild outlier, long ago
    const recent = Array.from({ length: 20 }, () => shot("7i", 150, 150));
    const m = clubModel([...stale, ...recent], "7i");
    expect(m.shots).toBe(20);
    expect(m.meanCarry).toBeCloseTo(150, 6); // the 300-yard outlier is outside the window
  });
});
