import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const menuRouter = Router();

// Public: anyone can browse the menu. Includes the craving profile so the
// owner's edit form can pre-fill it without a second request.
menuRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT m.id, m.name, m.description, m.price, m.category, m.is_available,
            i.stock_quantity,
            p.comfort, p.spicy, p.light, p.sweet, p.energizing
     FROM menu_items m
     LEFT JOIN inventory i ON i.menu_item_id = m.id
     LEFT JOIN menu_item_profiles p ON p.menu_item_id = m.id
     ORDER BY m.category, m.name`
  );
  res.json(result.rows);
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().min(1),
  profile: z
    .object({
      comfort: z.number().min(0).max(1),
      spicy: z.number().min(0).max(1),
      light: z.number().min(0).max(1),
      sweet: z.number().min(0).max(1),
      energizing: z.number().min(0).max(1),
    })
    .optional(),
  stockQuantity: z.number().int().nonnegative().optional().default(0),
});

// Owner-only: add a new dish, optionally seeding its craving profile for the mood recommender.
menuRouter.post("/", requireAuth, requireRole("owner"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, description, price, category, profile, stockQuantity } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const item = await client.query(
      `INSERT INTO menu_items (name, description, price, category)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, description ?? null, price, category]
    );
    const itemId = item.rows[0].id;

    const p = profile ?? { comfort: 0.5, spicy: 0.2, light: 0.5, sweet: 0.2, energizing: 0.3 };
    await client.query(
      `INSERT INTO menu_item_profiles (menu_item_id, comfort, spicy, light, sweet, energizing)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [itemId, p.comfort, p.spicy, p.light, p.sweet, p.energizing]
    );

    await client.query(
      `INSERT INTO inventory (menu_item_id, stock_quantity) VALUES ($1, $2)`,
      [itemId, stockQuantity]
    );

    await client.query("COMMIT");
    res.status(201).json({ id: itemId });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  isAvailable: z.boolean().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  profile: z
    .object({
      comfort: z.number().min(0).max(1),
      spicy: z.number().min(0).max(1),
      light: z.number().min(0).max(1),
      sweet: z.number().min(0).max(1),
      energizing: z.number().min(0).max(1),
    })
    .optional(),
});

// Owner-only: full edit — name/description/category/price/availability/stock/craving profile.
menuRouter.patch("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, description, category, price, isAvailable, stockQuantity, profile } = parsed.data;
  const { id } = req.params;

  if (
    name !== undefined ||
    description !== undefined ||
    category !== undefined ||
    price !== undefined ||
    isAvailable !== undefined
  ) {
    await pool.query(
      `UPDATE menu_items SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         price = COALESCE($4, price),
         is_available = COALESCE($5, is_available)
       WHERE id = $6`,
      [name ?? null, description ?? null, category ?? null, price ?? null, isAvailable ?? null, id]
    );
  }
  if (stockQuantity !== undefined) {
    await pool.query(
      `UPDATE inventory SET stock_quantity = $1, updated_at = now() WHERE menu_item_id = $2`,
      [stockQuantity, id]
    );
  }
  if (profile) {
    await pool.query(
      `UPDATE menu_item_profiles SET
         comfort = $1, spicy = $2, light = $3, sweet = $4, energizing = $5
       WHERE menu_item_id = $6`,
      [profile.comfort, profile.spicy, profile.light, profile.sweet, profile.energizing, id]
    );
  }
  res.json({ ok: true });
});

// Owner-only: hard-delete a dish, unless it has order history — a menu item
// referenced by past order_items can't be deleted without either orphaning
// those rows or violating the FK, so we ask the owner to 86 it instead.
menuRouter.delete("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const { id } = req.params;

  const referenced = await pool.query(
    `SELECT 1 FROM order_items WHERE menu_item_id = $1 LIMIT 1`,
    [id]
  );
  if (referenced.rowCount) {
    return res.status(409).json({
      error: "This dish has order history and can't be deleted — mark it unavailable instead.",
    });
  }

  const result = await pool.query(`DELETE FROM menu_items WHERE id = $1`, [id]);
  if (!result.rowCount) {
    return res.status(404).json({ error: "Dish not found" });
  }
  res.json({ ok: true });
});
