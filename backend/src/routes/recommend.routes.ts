import { Router } from "express";
import { z } from "zod";
import { getMoodRecommendations } from "../services/recommend.service.js";
import { AuthedRequest, optionalAuth } from "../middleware/auth.js";

export const recommendRouter = Router();

const moodSchema = z.object({
  mood: z.string().min(2).max(300),
});

// Public: mood-based recommendations work for anonymous browsers too,
// but attach the customer id when logged in so it can be tied to their order later.
recommendRouter.post("/mood", optionalAuth, async (req: AuthedRequest, res) => {
  const parsed = moodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await getMoodRecommendations(parsed.data.mood, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "Recommendation engine unavailable", detail: (err as Error).message });
  }
});
