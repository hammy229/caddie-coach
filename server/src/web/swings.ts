import type { Request, Response } from "express";
import { z } from "zod";
import { analyzeSwing, SwingAnalysisError } from "../domain/swing.js";
import { CLUBS, type SwingAnalysis } from "../domain/types.js";
import type { StateStore } from "../state/store.js";

const point = z.object({ x: z.number().min(-1).max(2), y: z.number().min(-1).max(2) });
const frame = z.object({
  t: z.number().min(0),
  leftShoulder: point,
  rightShoulder: point,
  leftHip: point,
  rightHip: point,
  leftWrist: point,
  rightWrist: point,
});
const body = z.object({
  frames: z.array(frame).min(10).max(1000),
  handed: z.enum(["right", "left"]).default("right"),
  club: z.enum(CLUBS).optional(),
});

/** POST /api/swings: analyze uploaded pose keypoints and save the result for the analyze_swing tool. */
export function swingUploadHandler(store: StateStore, today: () => string) {
  return async (req: Request, res: Response) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid swing capture", details: parsed.error.issues.slice(0, 3) });
      return;
    }
    const userId = res.locals.userId as string;
    try {
      const metrics = analyzeSwing(parsed.data.frames, parsed.data.handed);
      const state = await store.load(userId);
      const date = today();
      const swing: SwingAnalysis = {
        id: `w${state.swings.length + 1}-${date}`,
        date,
        club: parsed.data.club,
        handed: parsed.data.handed,
        ...metrics,
        reviewed: false,
      };
      state.swings.push(swing);
      await store.save(userId, state);
      res.status(201).json({ swing });
    } catch (err) {
      if (err instanceof SwingAnalysisError) {
        res.status(422).json({ error: err.message });
        return;
      }
      throw err;
    }
  };
}
