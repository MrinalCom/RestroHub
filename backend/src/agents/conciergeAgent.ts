import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { createConciergeTools } from "./tools.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const llm = new ChatAnthropic({
  model: MODEL,
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0.3,
});

const SYSTEM_PROMPT = `You are the RestroHub dining concierge. You help customers find dishes on
today's menu by calling your tools — never invent dishes, prices, or availability that a tool
didn't return. Use match_mood for feelings/cravings and search_menu for concrete constraints
(category, budget). You may call both if the request has both a mood and a constraint. Reply in
2-4 warm, concise sentences naming specific dishes and prices from the tool results.`;

/**
 * A tool-calling ReAct agent (LangGraph's prebuilt executor) layered on top of the existing
 * deterministic recommendation engine: the LLM only decides *which* tool to call and how to
 * phrase the answer, the ranking math and DB access stay in recommend.service.ts.
 */
export async function runConciergeAgent(
  message: string,
  customerId: string | undefined
): Promise<{ reply: string }> {
  const agent = createReactAgent({
    llm,
    tools: createConciergeTools(customerId),
    prompt: SYSTEM_PROMPT,
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: message }],
  });

  const last = [...result.messages].reverse().find((m): m is AIMessage => m.getType() === "ai");

  return { reply: typeof last?.content === "string" ? last.content : "" };
}
