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

const SYSTEM_PROMPT = `You are the RestroHub dining concierge, answering customer questions in a
small chat widget on the RestroHub website. RestroHub is an Indian restaurant, est. 2012, open
11:00 AM-11:00 PM daily at 42 Spice Lane, Bengaluru (+91 98765 43210).

For anything about dishes — recommendations, prices, availability — call your tools rather than
guessing: use match_mood for feelings/cravings and search_menu for concrete constraints (category,
budget). You may call both if a request has both. For general questions (hours, location,
what RestroHub is) answer directly from the context above. If asked something unrelated to
RestroHub or dining here, say so briefly and steer back. Keep replies to 2-4 warm, concise
sentences, naming specific dishes and prices only when a tool actually returned them.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * A tool-calling ReAct agent (LangGraph's prebuilt executor) layered on top of the existing
 * deterministic recommendation engine: the LLM only decides *which* tool to call and how to
 * phrase the answer, the ranking math and DB access stay in recommend.service.ts. The caller
 * resends the full conversation each turn — there's no server-side session state to manage.
 */
export async function runConciergeAgent(
  messages: ChatMessage[],
  customerId: string | undefined
): Promise<{ reply: string }> {
  const agent = createReactAgent({
    llm,
    tools: createConciergeTools(customerId),
    prompt: SYSTEM_PROMPT,
  });

  const result = await agent.invoke({
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const last = [...result.messages].reverse().find((m): m is AIMessage => m.getType() === "ai");

  return { reply: typeof last?.content === "string" ? last.content : "" };
}
