import { describe, expect, it } from "vitest";
import { mean, normalCdf, round1, stdDev } from "../src/domain/stats.js";

describe("mean", () => {
  it("returns 0 for an empty list", () => {
    expect(mean([])).toBe(0);
  });

  it("averages the values", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(mean([5])).toBe(5);
  });
});

describe("stdDev", () => {
  it("returns 0 when there are fewer than two values", () => {
    expect(stdDev([])).toBe(0);
    expect(stdDev([42])).toBe(0);
  });

  it("computes the sample standard deviation", () => {
    // mean 2, squared deviations 1 + 1 = 2, divided by n-1 = 1.
    expect(stdDev([1, 3])).toBeCloseTo(Math.SQRT2, 6);
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });

  it("is zero for identical values", () => {
    expect(stdDev([7, 7, 7, 7])).toBe(0);
  });
});

describe("normalCdf", () => {
  it("is 0.5 at the mean", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it("matches known standard-normal probabilities", () => {
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });

  it("is symmetric about the mean", () => {
    for (const z of [0.3, 1.1, 2.4]) {
      expect(normalCdf(-z)).toBeCloseTo(1 - normalCdf(z), 6);
    }
  });

  it("increases monotonically", () => {
    expect(normalCdf(-2)).toBeLessThan(normalCdf(0));
    expect(normalCdf(0)).toBeLessThan(normalCdf(2));
  });
});

describe("round1", () => {
  it("rounds to one decimal place", () => {
    expect(round1(2.34)).toBe(2.3);
    expect(round1(2.36)).toBe(2.4);
    expect(round1(10)).toBe(10);
  });
});
