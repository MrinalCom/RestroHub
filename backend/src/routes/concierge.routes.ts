import { Router } from "express";
import { z } from "zod";
import { runConciergeAgent } from "../agents/conciergeAgent.js";
import { AuthedRequest, optionalAuth } from "../middleware/auth.js";

export const conciergeRouter = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(500),
      })
    )
    .min(1)
    .max(20),
});

// Public: same anonymous-friendly shape as /api/recommend/mood, but backed by a
// tool-calling LangGraph agent that can also answer concrete menu questions. The
// client resends the whole conversation each turn — no session state on the server.
conciergeRouter.post("/chat", optionalAuth, async (req: AuthedRequest, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await runConciergeAgent(parsed.data.messages, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "Concierge agent unavailable", detail: (err as Error).message });
  }
});
