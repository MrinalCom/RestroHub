import { pool } from "../config/db.js";
import { redis } from "../config/redis.js";
import { extractCravingProfile, CravingProfile } from "./claude.service.js";

const CRAVING_DIMENSIONS = ["comfort", "spicy", "light", "sweet", "energizing"] as const;
type Dimension = (typeof CRAVING_DIMENSIONS)[number];

const PROFILE_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day — mood phrasing repeats a lot ("stressed", "tired")

function cosineSimilarity(a: Record<Dimension, number>, b: Record<Dimension, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const dim of CRAVING_DIMENSIONS) {
    dot += a[dim] * b[dim];
    normA += a[dim] ** 2;
    normB += b[dim] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface MenuItemRow {
  id: string;
  name: string;
  description: string;
  price: string;
  order_count: number;
  stock_quantity: number;
  comfort: number;
  spicy: number;
  light: number;
  sweet: number;
  energizing: number;
}

export interface Recommendation {
  id: string;
  name: string;
  description: string;
  price: number;
  score: number;
}

export interface MoodRecommendationResult {
  logId: string;
  cravingProfile: CravingProfile;
  recommendations: Recommendation[];
}

/**
 * The expensive, nondeterministic step (the LLM call) is what gets cached —
 * not the final ranked list, since popularity/stock change independently of mood.
 */
async function getCravingProfile(moodText: string): Promise<CravingProfile> {
  const cacheKey = `mood-profile:${moodText.trim().toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const profile = await extractCravingProfile(moodText);
  await redis.set(cacheKey, JSON.stringify(profile), "EX", PROFILE_CACHE_TTL_SECONDS);
  return profile;
}

export async function getMoodRecommendations(
  moodText: string,
  customerId: string | undefined,
  limit = 5
): Promise<MoodRecommendationResult> {
  const cravingProfile = await getCravingProfile(moodText);

  const itemsResult = await pool.query<MenuItemRow>(
    `SELECT m.id, m.name, m.description, m.price, m.order_count,
            COALESCE(i.stock_quantity, 0) AS stock_quantity,
            p.comfort, p.spicy, p.light, p.sweet, p.energizing
     FROM menu_items m
     JOIN menu_item_profiles p ON p.menu_item_id = m.id
     LEFT JOIN inventory i ON i.menu_item_id = m.id
     WHERE m.is_available = true AND COALESCE(i.stock_quantity, 0) > 0`
  );

  const maxOrderCount = Math.max(1, ...itemsResult.rows.map((r) => r.order_count));

  const ranked = itemsResult.rows
    .map((row) => {
      const semanticScore = cosineSimilarity(cravingProfile, row);
      const popularityScore = row.order_count / maxOrderCount;
      // Hybrid: mood match dominates, popularity is a tiebreaker/business signal —
      // pure semantic similarity alone tends to recommend obscure items nobody actually likes.
      const finalScore = 0.7 * semanticScore + 0.3 * popularityScore;
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: Number(row.price),
        score: Number(finalScore.toFixed(4)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const logResult = await pool.query(
    `INSERT INTO mood_recommendation_logs (customer_id, mood_text, craving_profile, recommended_item_ids)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [customerId ?? null, moodText, JSON.stringify(cravingProfile), ranked.map((r) => r.id)]
  );

  return {
    logId: logResult.rows[0].id,
    cravingProfile,
    recommendations: ranked,
  };
}

/**
 * Called when an order references a recommendation log, closing the feedback loop:
 * this is the label a future learned ranker (logistic regression / GBDT over these
 * same features) would train on, instead of hand-tuned weights like 0.7/0.3 above.
 */
export async function recordConversion(logId: string, menuItemId: string): Promise<void> {
  await pool.query(
    `UPDATE mood_recommendation_logs SET converted_item_id = $1 WHERE id = $2`,
    [menuItemId, logId]
  );
}
