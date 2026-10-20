import type { Request, Response } from "express";
import { z } from "zod";
import type { Club } from "../domain/types.js";

/**
 * Rule-based intent mapper for the simulated Alexa+ host (GET /alexa). It stands in for the Alexa+
 * model: it turns one spoken sentence into one MCP tool call. The tool call itself goes to the real
 * MCP endpoint from the browser, so everything after this step is the production path.
 */
export interface IntentContext {
  /** Target distance from the last club recommendation, used when a shot is logged without one. */
  lastDistance?: number;
}

export type Intent =
  | { kind: "tool"; tool: string; args: Record<string, unknown> }
  | { kind: "reply"; text: string };

const SMALL: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const WORD = Object.keys(SMALL).join("|");
const NUMBER_RUN = new RegExp(`\\b(?:a[\\s-]+hundred|${WORD})(?:[\\s-]+(?:and[\\s-]+)?(?:hundred|${WORD}))*\\b`, "g");

/** "a hundred and fifty" -> "150", "seven iron" -> "7 iron". Digits are left alone. */
export function wordsToDigits(text: string): string {
  return text.replace(NUMBER_RUN, (run) => {
    let n = 0;
    for (const w of run.split(/[\s-]+/)) {
      if (w === "hundred") n = (n || 1) * 100;
      else if (w in SMALL) n += SMALL[w]!;
    }
    return String(n);
  });
}

export function findClub(text: string): Club | undefined {
  if (/\bdriver\b/.test(text)) return "driver";
  if (/\b3[- ]?wood\b|\b3w\b/.test(text)) return "3w";
  if (/\b5[- ]?wood\b|\b5w\b/.test(text)) return "5w";
  if (/\bhybrid\b|\brescue\b/.test(text)) return "hybrid";
  if (/\bpitching wedge\b|\bpw\b/.test(text)) return "pw";
  if (/\bgap wedge\b|\bgw\b/.test(text)) return "gw";
  if (/\bsand wedge\b|\bsw\b/.test(text)) return "sw";
  if (/\blob wedge\b|\blw\b/.test(text)) return "lw";
  const iron = /\b([4-9])[- ]?iron\b|\b([4-9])i\b/.exec(text);
  return iron ? (`${iron[1] ?? iron[2]}i` as Club) : undefined;
}

const num = (re: RegExp, text: string): number | undefined => {
  const m = re.exec(text);
  const v = m?.slice(1).find((g) => g !== undefined);
  return v === undefined ? undefined : Number(v);
};

const HAZARD = "water|bunker|sand|hazard|trouble|creek|pond|lake|out of bounds";
function trouble(text: string): "short" | "long" | undefined {
  const m = new RegExp(`\\b(?:${HAZARD})\\b[^.,?]*?\\b(short|long|front|back|behind|over)\\b|\\b(short|long|front|back|behind)\\b[^.,?]*?\\b(?:${HAZARD})\\b`).exec(text);
  const where = m?.[1] ?? m?.[2];
  if (!where) return undefined;
  return where === "short" || where === "front" ? "short" : "long";
}

function wind(text: string): { wind?: string; wind_mph?: number } {
  const mph = num(/(\d+)\s*(?:mph|miles? (?:an|per) hour)/, text);
  let dir: string | undefined;
  if (/\binto\b[^.,?]*\bwind\b|\bheadwind\b|\bin my face\b|\bwind (?:is )?(?:in|against)\b/.test(text)) dir = "head";
  else if (/\bdown ?wind\b|\btailwind\b|\bwind (?:is )?(?:behind|helping)\b|\bwith the wind\b/.test(text)) dir = "tail";
  else if (/\bleft to right\b/.test(text)) dir = "left_to_right";
  else if (/\bright to left\b/.test(text)) dir = "right_to_left";
  if (!dir && mph === undefined) return {};
  return { wind: dir ?? "head", wind_mph: mph ?? 10 };
}

function elevation(text: string): number | undefined {
  const up = num(/(\d+)\s*(?:feet|foot|ft)\s*(?:up|uphill)\b|\buphill\s*(?:by\s*)?(\d+)/, text);
  if (up !== undefined) return up;
  const down = num(/(\d+)\s*(?:feet|foot|ft)\s*(?:down|downhill)\b|\bdownhill\s*(?:by\s*)?(\d+)/, text);
  return down !== undefined ? -down : undefined;
}

const RISK = /\b(safe|conservative|aggressive|normal)\b/;
const risk = (text: string) => {
  const w = RISK.exec(text)?.[1];
  return w === "conservative" ? "safe" : w;
};

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function parseUtterance(raw: string, ctx: IntentContext = {}): Intent {
  const text = wordsToDigits(
    raw.toLowerCase().replace(/[’]/g, "'").replace(/^\s*(?:hey\s+)?alexa\b[,!.]?\s*/, ""),
  ).trim();
  if (!text) return { kind: "reply", text: "I didn't catch that." };

  if (/\b(i'm done|i am done|end (?:the |my )?round|finish(?:ed)? (?:the |my )?round|i shot)\b/.test(text)) {
    const strokes = num(/\bshot (?:a |an )?(\d{2,3})\b/, text);
    return { kind: "tool", tool: "end_round", args: strokes && strokes >= 18 ? { strokes } : {} };
  }

  if (/\b(?:start|begin|starting)(?: a| my| the)? round\b|\bteeing off\b/.test(text)) {
    const at = /\b(?:at|on)\s+([^,.?]+?)(?=[,.?]|\s+(?:i'm|i am|today|par|feeling|playing)\b|$)/.exec(text);
    const args: Record<string, unknown> = { course: at ? titleCase(at[1]!.trim()) : "My Course" };
    const r = risk(text);
    if (r) args.risk_tolerance = r;
    const par = num(/\bpar (\d{2})\b/, text);
    if (par) args.par = par;
    const rating = num(/\brating (?:of )?(\d{2}(?:\.\d)?)\b/, text);
    if (rating) args.course_rating = rating;
    const slope = num(/\bslope (?:of )?(\d{2,3})\b/, text);
    if (slope) args.slope = slope;
    return { kind: "tool", tool: "start_round", args };
  }

  if (/\b(practice|work on|range session|drills?)\b/.test(text)) {
    const minutes = num(/(\d+)\s*(?:minutes?|mins?)\b/, text) ?? (/\ban hour\b/.test(text) ? 60 : undefined);
    return { kind: "tool", tool: "practice_plan", args: minutes ? { minutes: Math.min(180, Math.max(10, minutes)) } : {} };
  }

  if (/\bswing\b/.test(text)) return { kind: "tool", tool: "analyze_swing", args: {} };

  if (/\b(play this hole|plan (?:this |the )?hole|game plan|how should i play)\b/.test(text)) {
    const par = num(/\bpar ([345])\b/, text);
    const yards = num(/\b(\d{2,3})\s*(?:yards?|yd)\b|\b(\d{3})\b/, text);
    if (!par || !yards) return { kind: "reply", text: "Tell me the length and the par, like: 520 yard par 5." };
    const args: Record<string, unknown> = { par, hole_yards: yards };
    const t = trouble(text);
    if (t) args.trouble = t;
    const carry = num(/\bcarry (?:of )?(\d{2,3})\b|\b(\d{2,3}) (?:yards? )?to (?:carry|clear)\b/, text);
    if (carry) args.carry_hazard_yards = carry;
    return { kind: "tool", tool: "plan_hole", args };
  }

  if (/\bputt|\bfooter\b/.test(text) || (/\b(feet|foot)\b/.test(text) && /\b(made|holed|missed|drained|sank)\b/.test(text))) {
    const distance = num(/(\d+(?:\.\d)?)[- ]?(?:feet|foot|ft|footer)\b/, text);
    if (!distance) return { kind: "reply", text: "How long was the putt, in feet?" };
    const holed = /\b(made|holed|drained|sank|went in)\b/.test(text) && !/\bmiss(?:ed)?\b/.test(text);
    const args: Record<string, unknown> = { distance_feet: distance, holed };
    if (!holed) {
      const left = num(/\b(?:left(?: it)?|leaving|with|had)\s+(\d+(?:\.\d)?)\b/, text);
      if (left !== undefined && left !== distance) args.remaining_feet = left;
    }
    return { kind: "tool", tool: "log_putt", args };
  }

  if (/\b(handicap|profile|my distances|how far do i hit|my numbers|strokes gained|my game)\b/.test(text)) {
    return { kind: "tool", tool: "get_game_profile", args: {} };
  }

  const club = findClub(text);
  const asking = /\bwhat (?:should|do) i\b|\bwhich club\b|\bwhat club\b/.test(text);

  if (!club && !asking && /\b(feeling|play it|playing it|switch to|be more|go)\b/.test(text) && risk(text)) {
    return { kind: "tool", tool: "set_risk_tolerance", args: { risk_tolerance: risk(text) } };
  }

  if (club && !asking) {
    const target = num(/\b(?:from|at|into|target(?:ed)?|of)\s+(\d{2,3})\b/, text) ?? ctx.lastDistance;
    if (target === undefined) return { kind: "reply", text: "How far was that shot meant to go?" };
    const args: Record<string, unknown> = { club, target_yards: target };
    const carried = num(/\b(?:carried|flew)\s+(\d{2,3})\b/, text);
    if (carried !== undefined) args.carry_yards = carried;
    const short = num(/\b(\d{1,3})\s*(?:yards?\s+)?short\b/, text);
    const long = num(/\b(\d{1,3})\s*(?:yards?\s+)?long\b/, text);
    if (short !== undefined) args.distance_miss_yards = -short;
    else if (long !== undefined) args.distance_miss_yards = long;
    else if (carried === undefined) args.distance_miss_yards = 0;
    const left = num(/\b(\d{1,3})\s*(?:yards?\s+)?left\b/, text);
    const right = num(/\b(\d{1,3})\s*(?:yards?\s+)?right\b/, text);
    if (left !== undefined) args.lateral_miss_yards = -left;
    else if (right !== undefined) args.lateral_miss_yards = right;
    return { kind: "tool", tool: "log_shot", args };
  }

  const scrubbed = text.replace(/\d+(?:\.\d)?\s*(?:mph|miles?|feet|foot|ft|minutes?|mins?)\b/g, " ");
  const distance = num(/\b(\d{2,3})\b/, scrubbed);
  if (distance !== undefined) {
    const args: Record<string, unknown> = { distance_yards: Math.min(320, Math.max(20, distance)), ...wind(text) };
    const el = elevation(text);
    if (el !== undefined) args.elevation_feet = el;
    const t = trouble(text);
    if (t) args.trouble = t;
    return { kind: "tool", tool: "recommend_club", args };
  }

  return {
    kind: "reply",
    text: "I can start a round, pick a club, plan a hole, log shots and putts, check your swing, recap your round or build a practice plan.",
  };
}

const intentBody = z.object({
  utterance: z.string().min(1).max(500),
  context: z.object({ lastDistance: z.number().int().min(1).max(400).optional() }).default({}),
});

/** POST /api/intent: map a sentence to a tool call for the simulated host. */
export function intentHandler(req: Request, res: Response) {
  const parsed = intentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid utterance" });
    return;
  }
  res.json(parseUtterance(parsed.data.utterance, parsed.data.context));
}
