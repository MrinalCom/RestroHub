import { Router } from "express";
import { z } from "zod";
import { getMoodRecommendations } from "../services/recommend.service.js";
import { getFallbackMoodRecommendations } from "../services/fallbackConcierge.service.js";
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
    // Claude being down shouldn't take the whole feature offline — fall back to a
    // keyword-guessed craving vector run through the same ranking math.
    console.error("Mood recommender unavailable, falling back:", (err as Error).message);
    try {
      const fallback = await getFallbackMoodRecommendations(parsed.data.mood, req.user?.id);
      res.json(fallback);
    } catch (fallbackErr) {
      res.status(502).json({
        error: "Recommendation engine unavailable",
        detail: (fallbackErr as Error).message,
      });
    }
  }
});
