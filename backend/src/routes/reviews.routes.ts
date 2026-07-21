import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { scrapeAndAnalyze, getLatestReviewScrape } from "../services/reviewInsights.service.js";

export const reviewsRouter = Router();

const scrapeSchema = z.object({
  url: z.string().url(),
});

// Owner-only: this triggers an outbound fetch to a URL the owner supplies, so it's
// gated the same way menu/stats management is, not exposed to anonymous customers.
reviewsRouter.post("/scrape", requireAuth, requireRole("owner"), async (req: AuthedRequest, res) => {
  const parsed = scrapeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const summary = await scrapeAndAnalyze(parsed.data.url);
    res.json(summary);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

reviewsRouter.get("/latest", requireAuth, requireRole("owner"), async (_req, res) => {
  const summary = await getLatestReviewScrape();
  res.json(summary);
});
