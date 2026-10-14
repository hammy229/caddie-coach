import { describe, expect, it } from "vitest";
import { clubModel } from "../src/domain/dispersion.js";
import { crosswindDrift, playsLike, recommendClub } from "../src/domain/recommend.js";
import { normalCdf } from "../src/domain/stats.js";
import { shot } from "./fixtures.js";

describe("normalCdf", () => {
  it("matches known values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 5);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });
});

describe("clubModel", () => {
  it("uses defaults until three shots are logged", () => {
    expect(clubModel([shot("7i", 150, 140)], "7i").source).toBe("default");
  });

  it("learns the player's own carry and lateral bias", () => {
    const shots = [shot("7i", 150, 160, 6), shot("7i", 150, 164, 8), shot("7i", 150, 162, 10)];
    const m = clubModel(shots, "7i");
    expect(m.source).toBe("personal");
    expect(m.meanCarry).toBeCloseTo(162, 0);
    expect(m.meanLateral).toBeCloseTo(8, 0);
  });

  it("ignores short-game shots", () => {
    const shots = [1, 2, 3].map(() => shot("sw", 30, 30, 0, "short_game"));
    expect(clubModel(shots, "sw").source).toBe("default");
  });
});

describe("playsLike", () => {
  it("adds more for headwind than it takes away for tailwind", () => {
    expect(playsLike({ distanceYards: 150, wind: "head", windMph: 10 })).toBe(165);
    expect(playsLike({ distanceYards: 150, wind: "tail", windMph: 10 })).toBe(143);
  });

  it("adds a yard per three feet uphill", () => {
    expect(playsLike({ distanceYards: 150, elevationFeet: 30 })).toBe(160);
  });

  it("computes crosswind drift direction", () => {
    expect(crosswindDrift({ distanceYards: 150, wind: "left_to_right", windMph: 10 }, 150)).toBeGreaterThan(0);
    expect(crosswindDrift({ distanceYards: 150, wind: "right_to_left", windMph: 10 }, 150)).toBeLessThan(0);
  });
});

describe("recommendClub", () => {
  it("uses personal distances instead of the generic chart", () => {
    // This player hits 7i 160 rather than the default 145.
    const shots = [shot("7i", 160, 159), shot("7i", 160, 161), shot("7i", 160, 160)];
    const rec = recommendClub(shots, { distanceYards: 160 }, "normal");
    expect(rec.club).toBe("7i");
  });

  it("aims away from the player's usual miss", () => {
    const shots = [shot("7i", 160, 160, 9), shot("7i", 160, 161, 11), shot("7i", 160, 159, 10)];
    const rec = recommendClub(shots, { distanceYards: 160 }, "normal");
    expect(rec.aimYards).toBe(-10);
    expect(rec.reasons.join(" ")).toContain("miss 10 yards right");
  });

  it("clubs up into a headwind", () => {
    const calm = recommendClub([], { distanceYards: 145 }, "normal");
    const windy = recommendClub([], { distanceYards: 145, wind: "head", windMph: 20 }, "normal");
    expect(calm.club).toBe("7i");
    expect(windy.playsLikeYards).toBe(174);
    expect(windy.club).toBe("4i");
  });

  it("plays safer than aggressive when there is trouble long", () => {
    const c = { distanceYards: 140, trouble: "long" as const };
    const safe = recommendClub([], c, "safe");
    const aggressive = recommendClub([], c, "aggressive");
    const carry = (club: string) => ["8i", "7i", "6i"].indexOf(club);
    expect(carry(safe.club)).toBeLessThanOrEqual(carry(aggressive.club));
    expect(safe.alternatives).toHaveLength(2);
  });
});
