import { z } from "zod";
import type { Narrator } from "../domain/narrator.js";
import { CLUBS } from "../domain/types.js";
import type { StateStore } from "../state/store.js";

export interface ToolContext {
  store: StateStore;
  narrator: Narrator;
  userId: string;
  /** Today's date as YYYY-MM-DD. Injectable so tests are deterministic. */
  today: () => string;
}

export const ROUND_REPORT_UI_URI = "ui://caddie-coach/round-report";
export const SWING_UI_URI = "ui://caddie-coach/swing";

export const clubSchema = z
  .enum(CLUBS)
  .describe("Club: driver, 3w, 5w, hybrid, 4i-9i, pw, gw, sw or lw");

export const riskSchema = z
  .enum(["safe", "normal", "aggressive"])
  .describe("How much risk the golfer wants to take today");

export function result(text: string, structured?: object, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structured ? { structuredContent: structured as Record<string, unknown> } : {}),
    ...(isError ? { isError: true } : {}),
  };
}

export const nextId = (prefix: string, existing: { length: number }, date: string) =>
  `${prefix}${existing.length + 1}-${date}`;
