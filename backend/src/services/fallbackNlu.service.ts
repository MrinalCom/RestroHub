import Fuse from "fuse.js";
import { CRAVING_DIMENSIONS, CravingVector, Dimension } from "./recommend.service.js";

// Same 5 dimensions the Claude tool-use call extracts — just guessed from keyword hits
// instead of understood, so it can plug straight into the existing ranking math with no
// LLM in the loop at all.
const DIMENSION_KEYWORDS: Record<Dimension, string[]> = {
  comfort: ["comfort", "cozy", "stressed", "sad", "rainy", "cold", "home", "hug"],
  spicy: ["spicy", "spice", "hot", "chili", "chilli", "fiery", "heat"],
  light: ["light", "healthy", "fresh", "diet", "not heavy", "cool", "refreshing"],
  sweet: ["sweet", "dessert", "sugar", "treat", "celebrat"],
  energizing: ["tired", "energy", "energize", "sleepy", "caffeine", "boost", "morning", "awake"],
};

export interface KeywordProfileResult {
  profile: CravingVector;
  matchedKeywords: string[];
}

/**
 * A hand-rolled substitute for extractCravingProfile() when Claude is unreachable. No
 * training data, no dependency — every dimension a keyword hits gets weighted up, every
 * dimension that gets no hits stays at a neutral baseline so cosine similarity still
 * produces a sensible (if cruder) ranking rather than a zero vector.
 */
export function keywordCravingProfile(text: string): KeywordProfileResult {
  const lower = text.toLowerCase();
  const profile = {} as CravingVector;
  const matchedKeywords: string[] = [];

  for (const dim of CRAVING_DIMENSIONS) {
    const hit = DIMENSION_KEYWORDS[dim].find((kw) => lower.includes(kw));
    profile[dim] = hit ? 0.85 : 0.2;
    if (hit) matchedKeywords.push(hit);
  }

  return { profile, matchedKeywords };
}

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQS: FaqEntry[] = [
  { question: "what are your hours what time do you open close", answer: "We're open daily from 11:00 AM to 11:00 PM." },
  { question: "where are you located what is your address", answer: "You'll find us at 42 Spice Lane, Bengaluru." },
  { question: "phone number contact call you", answer: "You can reach us at +91 98765 43210." },
  { question: "what is restrohub tell me about the restaurant who are you", answer: "RestroHub is an Indian restaurant, est. 2012, serving dishes from tandoori classics to biryani and curries." },
  { question: "can i book a table make a reservation", answer: "You can call us to reserve a table, or use the reservation option once you're logged in." },
];

const fuse = new Fuse(FAQS, { keys: ["question"], threshold: 0.4, includeScore: true });

/** Fuzzy FAQ lookup — deterministic, explainable, and needs no LLM or training data. */
export function matchFaq(text: string): string | null {
  const [best] = fuse.search(text);
  return best ? best.item.answer : null;
}
