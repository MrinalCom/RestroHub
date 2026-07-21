import { rankMenuByProfile, logRecommendation, MoodRecommendationResult } from "./recommend.service.js";
import { keywordCravingProfile, matchFaq } from "./fallbackNlu.service.js";

export interface FallbackReply {
  reply: string;
  degraded: true;
}

const OUT_OF_OPTIONS_REPLY =
  "The smart assistant is temporarily unavailable, and I couldn't find a good match for that. " +
  "You can browse the full menu above, or call us at +91 98765 43210.";

/**
 * Answers what it can without an LLM: an FAQ lookup first (hours, location, etc.), then a
 * keyword-guessed craving vector fed through the same ranking math the real recommender
 * uses. Only falls back to a generic pointer-to-menu reply if neither produces anything.
 */
export async function answerWithFallback(message: string): Promise<FallbackReply> {
  const faqAnswer = matchFaq(message);
  if (faqAnswer) {
    return { reply: faqAnswer, degraded: true };
  }

  try {
    const { profile, matchedKeywords } = keywordCravingProfile(message);
    const recommendations = await rankMenuByProfile(profile, 3);

    if (recommendations.length > 0) {
      const picks = recommendations.map((r) => `${r.name} ($${r.price.toFixed(2)})`).join(", ");
      const basis =
        matchedKeywords.length > 0
          ? `some picks based on "${matchedKeywords.join(", ")}"`
          : "some popular picks";
      return {
        reply: `The smart assistant is temporarily unavailable, but here are ${basis} while it's back: ${picks}.`,
        degraded: true,
      };
    }
  } catch {
    // DB unreachable too — fall through to the generic reply below.
  }

  return { reply: OUT_OF_OPTIONS_REPLY, degraded: true };
}

/**
 * Same idea as answerWithFallback, shaped to match MoodRecommendationResult so the
 * existing mood-picker UI (which reads .recommendations / .cravingProfile.reasoning)
 * keeps working verbatim when Claude is unreachable.
 */
export async function getFallbackMoodRecommendations(
  moodText: string,
  customerId: string | undefined,
  limit = 5
): Promise<MoodRecommendationResult> {
  const { profile, matchedKeywords } = keywordCravingProfile(moodText);
  const recommendations = await rankMenuByProfile(profile, limit);
  const reasoning =
    matchedKeywords.length > 0
      ? `Smart assistant unavailable — matched using keywords: ${matchedKeywords.join(", ")}.`
      : "Smart assistant unavailable — showing popular picks instead.";
  const cravingProfile = { ...profile, reasoning };
  const logId = await logRecommendation(customerId, moodText, cravingProfile, recommendations);

  return { logId, cravingProfile, recommendations };
}
