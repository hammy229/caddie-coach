import { describe, expect, it } from "vitest";
import { analyzeSwing, SwingAnalysisError } from "../src/domain/swing.js";
import { syntheticSwing } from "./fixtures.js";

describe("analyzeSwing", () => {
  it("measures a smooth 3:1 tempo with no faults", () => {
    const m = analyzeSwing(syntheticSwing());
    expect(m.tempoRatio).toBeGreaterThan(2.5);
    expect(m.tempoRatio).toBeLessThan(3.8);
    expect(m.faults).toEqual([]);
  });

  it("flags a rushed backswing", () => {
    const m = analyzeSwing(syntheticSwing({ backswingMs: 400, downswingMs: 260 }));
    expect(m.faults).toContain("fast_tempo");
  });

  it("flags coming over the top", () => {
    const m = analyzeSwing(syntheticSwing({ overTheTop: true }));
    expect(m.faults).toContain("over_the_top");
    expect(m.outwardToDropRatio).toBeGreaterThan(0.5);
  });

  it("flags early extension", () => {
    const m = analyzeSwing(syntheticSwing({ earlyExtension: true }));
    expect(m.faults).toContain("early_extension");
    expect(m.spineAngleChangeDeg).toBeGreaterThan(8);
  });

  it("rejects captures that are too short or have no motion", () => {
    expect(() => analyzeSwing(syntheticSwing().slice(0, 5))).toThrow(SwingAnalysisError);
    const still = syntheticSwing().slice(0, 12).map((f, i) => ({ ...syntheticSwing()[0]!, t: i * 16 }));
    expect(() => analyzeSwing(still)).toThrow(/No swing motion/);
  });
});
