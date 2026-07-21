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

export type ReviewSentiment = "positive" | "neutral" | "negative";

export interface ReviewInsights {
  overallSentiment: "positive" | "mixed" | "negative";
  positiveThemes: string[];
  negativeThemes: string[];
  summary: string;
  perReview: { index: number; sentiment: ReviewSentiment }[];
}

const REVIEW_INSIGHTS_TOOL = {
  name: "analyze_reviews",
  description:
    "Analyze a batch of scraped review/testimonial text snippets and extract overall sentiment, recurring themes, and a per-review sentiment label.",
  input_schema: {
    type: "object" as const,
    properties: {
      overallSentiment: { type: "string", enum: ["positive", "mixed", "negative"] },
      positiveThemes: {
        type: "array",
        items: { type: "string" },
        description: "Short recurring positive themes, e.g. 'fast delivery', 'friendly staff'",
      },
      negativeThemes: {
        type: "array",
        items: { type: "string" },
        description: "Short recurring negative themes, e.g. 'long wait times'",
      },
      summary: { type: "string", description: "2-3 sentence summary for a restaurant owner" },
      perReview: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "0-based index into the input reviews array" },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          },
          required: ["index", "sentiment"],
        },
      },
    },
    required: ["overallSentiment", "positiveThemes", "negativeThemes", "summary", "perReview"],
  },
};

export async function analyzeReviews(reviews: string[]): Promise<ReviewInsights> {
  const numbered = reviews.map((r, i) => `[${i}] ${r}`).join("\n\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [REVIEW_INSIGHTS_TOOL],
    tool_choice: { type: "tool", name: "analyze_reviews" },
    messages: [
      {
        role: "user",
        content: `Here are ${reviews.length} scraped review/testimonial snippets from a restaurant's web presence. Some snippets may be site navigation or unrelated text that slipped through the scraper — ignore those when forming themes.\n\n${numbered}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return structured review insights");
  }
  return toolUse.input as ReviewInsights;
}
