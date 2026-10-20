import { describe, expect, it } from "vitest";
import { findClub, parseUtterance, wordsToDigits } from "../src/web/intents.js";

const tool = (utterance: string, ctx = {}) => {
  const i = parseUtterance(utterance, ctx);
  if (i.kind !== "tool") throw new Error(`expected a tool call for "${utterance}", got reply: ${i.text}`);
  return i;
};

describe("wordsToDigits", () => {
  it("converts spoken numbers", () => {
    expect(wordsToDigits("a hundred and fifty to the pin")).toBe("150 to the pin");
    expect(wordsToDigits("seven iron came up ten short")).toBe("7 iron came up 10 short");
    expect(wordsToDigits("one hundred forty five")).toBe("145");
    expect(wordsToDigits("150 yards")).toBe("150 yards");
  });
});

describe("findClub", () => {
  it("recognizes clubs", () => {
    expect(findClub("7 iron")).toBe("7i");
    expect(findClub("my 9i")).toBe("9i");
    expect(findClub("driver")).toBe("driver");
    expect(findClub("3 wood")).toBe("3w");
    expect(findClub("pitching wedge")).toBe("pw");
    expect(findClub("sand wedge")).toBe("sw");
    expect(findClub("the putter")).toBeUndefined();
  });
});

describe("parseUtterance: demo script phrases", () => {
  it("starts a round with course and risk", () => {
    expect(tool("Alexa, start a round at Butler Park. I'm feeling aggressive today.")).toEqual({
      kind: "tool",
      tool: "start_round",
      args: { course: "Butler Park", risk_tolerance: "aggressive" },
    });
  });

  it("captures par, rating and slope", () => {
    expect(tool("start a round at Lions par 72 rating 70.4 slope 118").args).toEqual({
      course: "Lions",
      par: 72,
      course_rating: 70.4,
      slope: 118,
    });
  });

  it("plans a hole", () => {
    expect(tool("How should I play this hole? It's a 520 par 5, water short of the green.")).toEqual({
      kind: "tool",
      tool: "plan_hole",
      args: { par: 5, hole_yards: 520, trouble: "short" },
    });
  });

  it("asks for the missing par instead of guessing", () => {
    expect(parseUtterance("how should I play this hole").kind).toBe("reply");
  });

  it("recommends a club with wind and trouble", () => {
    expect(tool("150 to the pin into a 10 mile an hour wind, water long. What should I hit?")).toEqual({
      kind: "tool",
      tool: "recommend_club",
      args: { distance_yards: 150, wind: "head", wind_mph: 10, trouble: "long" },
    });
  });

  it("handles spoken numbers and elevation", () => {
    expect(tool("a hundred and forty, 10 feet uphill, what club").args).toEqual({ distance_yards: 140, elevation_feet: 10 });
  });

  it("logs a short approach using the last recommended distance", () => {
    expect(tool("7 iron came up 10 short", { lastDistance: 150 })).toEqual({
      kind: "tool",
      tool: "log_shot",
      args: { club: "7i", target_yards: 150, distance_miss_yards: -10 },
    });
  });

  it("logs a shot with its own target and a lateral miss", () => {
    expect(tool("hit my 8 iron from 140, 12 short and 5 right").args).toEqual({
      club: "8i",
      target_yards: 140,
      distance_miss_yards: -12,
      lateral_miss_yards: 5,
    });
  });

  it("asks for the target when a shot has none", () => {
    expect(parseUtterance("driver went 20 right").kind).toBe("reply");
  });

  it("logs putts", () => {
    expect(tool("made a 12 footer").args).toEqual({ distance_feet: 12, holed: true });
    expect(tool("missed a 20 foot putt, left it 3 feet short").args).toEqual({ distance_feet: 20, holed: false, remaining_feet: 3 });
  });

  it("checks the swing", () => {
    expect(tool("Alexa, how was that swing?").tool).toBe("analyze_swing");
  });

  it("ends the round with a score", () => {
    expect(tool("Alexa, I'm done. I shot 88.")).toEqual({ kind: "tool", tool: "end_round", args: { strokes: 88 } });
    expect(tool("end my round").args).toEqual({});
  });

  it("builds a practice plan", () => {
    expect(tool("I've got 30 minutes at the range. What should I work on?")).toEqual({
      kind: "tool",
      tool: "practice_plan",
      args: { minutes: 30 },
    });
  });

  it("reads the game profile", () => {
    expect(tool("what's my handicap").tool).toBe("get_game_profile");
  });

  it("changes risk tolerance mid-round", () => {
    expect(tool("I'm feeling safe now").args).toEqual({ risk_tolerance: "safe" });
  });

  it("falls back to help for anything else", () => {
    expect(parseUtterance("tell me a joke").kind).toBe("reply");
  });
});
