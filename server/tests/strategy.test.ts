import { describe, expect, it } from "vitest";
import { planHole } from "../src/domain/strategy.js";

describe("planHole", () => {
  it("plans a par 3 as a single approach to the green", () => {
    const plan = planHole([], { par: 3, holeYards: 160 }, "normal");
    expect(plan.shots).toHaveLength(1);
    expect(plan.shots[0]?.number).toBe(1);
  });

  it("plans a par 4 as tee shot plus approach", () => {
    const plan = planHole([], { par: 4, holeYards: 410 }, "normal");
    expect(plan.shots).toHaveLength(2);
    expect(plan.shots[0]?.club).toBe("driver");
    expect(plan.shots[1]?.note).toContain("green");
  });

  it("lays up on a long par 5 when playing it safe", () => {
    const plan = planHole([], { par: 5, holeYards: 560 }, "safe");
    expect(plan.shots).toHaveLength(3);
    expect(plan.shots[1]?.note).toContain("lay up");
  });

  it("goes for a reachable par 5 when aggressive", () => {
    // Driver (230) + longest wood (210) covers ~440 yards.
    const plan = planHole([], { par: 5, holeYards: 440 }, "aggressive");
    expect(plan.shots.some((s) => s.note.includes("go for the green"))).toBe(true);
  });

  it("clubs down off a short par 4 tee when not aggressive", () => {
    const plan = planHole([], { par: 4, holeYards: 300 }, "safe");
    expect(plan.shots[0]?.club).not.toBe("driver");
  });
});
