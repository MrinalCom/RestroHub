import { Router } from "express";
import { z } from "zod";
import { runConciergeAgent } from "../agents/conciergeAgent.js";
import { answerWithFallback } from "../services/fallbackConcierge.service.js";
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
    res.json({ ...result, degraded: false });
  } catch (err) {
    // The LLM being down doesn't have to mean the chat widget goes silent — FAQ lookup
    // and keyword-based recommendations still work without it.
    console.error("Concierge agent unavailable, falling back:", (err as Error).message);
    const lastUserMessage = [...parsed.data.messages].reverse().find((m) => m.role === "user");
    const fallback = await answerWithFallback(lastUserMessage?.content ?? "");
    res.json(fallback);
  }
});
