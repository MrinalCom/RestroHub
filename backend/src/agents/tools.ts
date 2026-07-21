import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { pool } from "../config/db.js";
import { getMoodRecommendations } from "../services/recommend.service.js";

interface MenuSearchRow {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  stock_quantity: number;
}

/**
 * Tools are built per-request (not module-level) so customerId can be closed over
 * instead of trusted as an LLM-supplied argument — the model picks *what* to search
 * for, never *who* the search is on behalf of.
 */
export function createConciergeTools(customerId: string | undefined) {
  const searchMenu = tool(
    async ({ category, maxPrice }: { category?: string; maxPrice?: number }) => {
      const conditions = ["m.is_available = true", "COALESCE(i.stock_quantity, 0) > 0"];
      const params: unknown[] = [];

      if (category) {
        params.push(category);
        conditions.push(`m.category = $${params.length}`);
      }
      if (typeof maxPrice === "number") {
        params.push(maxPrice);
        conditions.push(`m.price <= $${params.length}`);
      }

      const result = await pool.query<MenuSearchRow>(
        `SELECT m.id, m.name, m.description, m.price, m.category,
                COALESCE(i.stock_quantity, 0) AS stock_quantity
         FROM menu_items m
         LEFT JOIN inventory i ON i.menu_item_id = m.id
         WHERE ${conditions.join(" AND ")}
         ORDER BY m.order_count DESC
         LIMIT 12`,
        params
      );

      return JSON.stringify(
        result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          price: Number(r.price),
          category: r.category,
          inStock: r.stock_quantity > 0,
        }))
      );
    },
    {
      name: "search_menu",
      description:
        "Search the currently available menu, optionally filtered by category and/or a maximum price. Use this for concrete constraints like budget or dish type — not for mood-based requests.",
      schema: z.object({
        category: z
          .enum(["starters", "mains", "biryani", "breads", "desserts", "beverages"])
          .optional()
          .describe("Restrict results to this menu category"),
        maxPrice: z.number().positive().optional().describe("Maximum price in dollars"),
      }),
    }
  );

  const matchMood = tool(
    async ({ mood }: { mood: string }) => {
      const result = await getMoodRecommendations(mood, customerId, 5);
      return JSON.stringify({
        reasoning: result.cravingProfile.reasoning,
        recommendations: result.recommendations,
      });
    },
    {
      name: "match_mood",
      description:
        "Given a free-text description of how the customer is feeling or what they're craving, returns the best-matching dishes from the hybrid mood-recommendation engine (semantic craving match blended with popularity and stock). Use this whenever the customer describes a mood, feeling, or vague craving rather than a hard constraint.",
      schema: z.object({
        mood: z.string().min(2).max(300).describe("The customer's mood or craving, in their own words"),
      }),
    }
  );

  return [searchMenu, matchMood];
}
