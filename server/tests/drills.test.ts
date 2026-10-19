import { describe, expect, it } from "vitest";
import { buildPracticePlan } from "../src/domain/drills.js";
import { emptyState, type SwingAnalysis, type UserState } from "../src/domain/types.js";

function swingWith(faults: SwingAnalysis["faults"]): SwingAnalysis {
  return {
    id: "w1",
    date: "2026-10-18",
    handed: "right",
    tempoRatio: 3,
    backswingMs: 750,
    downswingMs: 250,
    spineAngleChangeDeg: 2,
    outwardToDropRatio: 0.5,
    faults,
    reviewed: false,
  };
}

function stateWith(partial: Partial<UserState>): UserState {
  return { ...emptyState(), ...partial };
}

describe("buildPracticePlan", () => {
  it("prioritises a recurring swing fault", () => {
    const swings = [1, 2, 3].map(() => swingWith(["over_the_top"]));
    const plan = buildPracticePlan(stateWith({ swings }), 45);
    expect(plan.drills[0]?.name).toBe("Headcover gate");
    expect(plan.focus).toContain("over the top");
  });

  it("never exceeds the time budget", () => {
    const swings = [1, 2, 3].map(() => swingWith(["over_the_top"]));
    const plan = buildPracticePlan(stateWith({ swings }), 30);
    expect(plan.totalMinutes).toBeLessThanOrEqual(30);
  });

  it("always returns at least one drill, even for a short session", () => {
    const plan = buildPracticePlan(emptyState(), 10);
    expect(plan.drills.length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to general drills with no data", () => {
    const plan = buildPracticePlan(emptyState(), 45);
    expect(plan.drills.map((d) => d.name)).toContain("Up and down circuit");
  });
});
