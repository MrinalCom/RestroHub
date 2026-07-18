import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export interface CravingProfile {
  comfort: number;
  spicy: number;
  light: number;
  sweet: number;
  energizing: number;
  reasoning: string;
}

const CRAVING_PROFILE_TOOL = {
  name: "extract_craving_profile",
  description:
    "Extract a structured craving profile from a free-text description of how the customer feels or what they're in the mood for.",
  input_schema: {
    type: "object" as const,
    properties: {
      comfort: { type: "number", minimum: 0, maximum: 1, description: "Craving for rich, comforting food" },
      spicy: { type: "number", minimum: 0, maximum: 1, description: "Craving for heat/spice" },
      light: { type: "number", minimum: 0, maximum: 1, description: "Craving for light, fresh food" },
      sweet: { type: "number", minimum: 0, maximum: 1, description: "Craving for something sweet" },
      energizing: { type: "number", minimum: 0, maximum: 1, description: "Need for an energy/caffeine boost" },
      reasoning: { type: "string", description: "One sentence explaining the read on the customer's mood" },
    },
    required: ["comfort", "spicy", "light", "sweet", "energizing", "reasoning"],
  },
};

/**
 * Forces structured JSON output via tool-use instead of parsing free text,
 * so downstream ranking can rely on the shape without a fragile parser.
 */
export async function extractCravingProfile(moodText: string): Promise<CravingProfile> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    tools: [CRAVING_PROFILE_TOOL],
    tool_choice: { type: "tool", name: "extract_craving_profile" },
    messages: [
      {
        role: "user",
        content: `Customer's mood/craving: "${moodText}"`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return a structured craving profile");
  }
  return toolUse.input as CravingProfile;
}
