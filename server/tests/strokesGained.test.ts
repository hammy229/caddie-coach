import { describe, expect, it } from "vitest";
import {
  approachStrokesGained,
  expectedPutts,
  expectedStrokes,
  proximityYards,
  puttStrokesGained,
  strokesGained,
} from "../src/domain/strokesGained.js";
import type { Putt } from "../src/domain/types.js";
import { shot } from "./fixtures.js";

const putt = (distanceFeet: number, holed: boolean, remainingFeet = 0): Putt => ({
  id: "p1",
  roundId: "r1",
  distanceFeet,
  holed,
  remainingFeet,
  date: "2026-10-18",
});

describe("expected strokes tables", () => {
  it("returns known benchmark points for putting", () => {
    expect(expectedPutts(3)).toBeCloseTo(1.04, 2);
    expect(expectedPutts(10)).toBeCloseTo(1.61, 2);
  });

  it("holes a tap-in putt in one", () => {
    expect(expectedPutts(0.3)).toBe(1);
  });

  it("interpolates between putting points", () => {
    // Halfway between 3 ft (1.04) and 4 ft (1.13).
    expect(expectedPutts(3.5)).toBeCloseTo(1.085, 3);
  });

  it("clamps below and above the table range", () => {
    expect(expectedPutts(1)).toBe(1.01);
    expect(expectedPutts(200)).toBe(2.4);
  });

  it("returns known benchmark points for the fairway", () => {
    expect(expectedStrokes(150, "fairway")).toBeCloseTo(2.945, 2);
    expect(expectedStrokes(100, "fairway")).toBeCloseTo(2.8, 2);
  });

  it("is harder from the rough than the fairway at the same distance", () => {
    expect(expectedStrokes(160, "rough")).toBeGreaterThan(expectedStrokes(160, "fairway"));
  });
});

describe("proximity", () => {
  it("combines distance and lateral miss as a straight-line gap", () => {
    expect(proximityYards(shot("7i", 150, 147, 4))).toBeCloseTo(5, 5); // 3-4-5 triangle
  });
});

describe("approach strokes gained", () => {
  it("is positive for a shot that finishes close", () => {
    const sg = approachStrokesGained(shot("8i", 140, 139, 2, "approach"));
    expect(sg).toBeGreaterThan(0);
  });

  it("is negative for a shot that misses well wide", () => {
    const sg = approachStrokesGained(shot("8i", 140, 120, 30, "approach"));
    expect(sg).toBeLessThan(0);
  });
});

describe("putt strokes gained", () => {
  it("rewards holing a long putt", () => {
    expect(puttStrokesGained(putt(30, true))).toBeGreaterThan(0.9);
  });

  it("penalises a three-putt start that leaves work behind", () => {
    expect(puttStrokesGained(putt(20, false, 6))).toBeLessThan(0);
  });

  it("a lipped-out tap-in loses nearly a full stroke", () => {
    expect(puttStrokesGained(putt(3, false, 2))).toBeCloseTo(-0.97, 2);
  });
});

describe("aggregate", () => {
  it("sums approach and putting, ignoring tee and short-game shots for approach", () => {
    const sg = strokesGained(
      [shot("driver", 250, 250, 0, "tee"), shot("8i", 140, 139, 2, "approach")],
      [putt(10, true)],
    );
    expect(sg.approachShots).toBe(1);
    expect(sg.putts).toBe(1);
    expect(sg.total).toBeCloseTo(sg.approach + sg.putting, 5);
  });
});
