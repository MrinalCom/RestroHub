import { Router } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import { pool } from "../config/db.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { recordConversion } from "../services/recommend.service.js";

export const ordersRouter = Router();

const createSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  // Optional: links this order back to a mood recommendation log so we can
  // measure whether the AI's suggestion actually converted.
  recommendationLogId: z.string().uuid().optional(),
});

ordersRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { items, recommendationLogId } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const order = await client.query(
      `INSERT INTO orders (customer_id, status, total) VALUES ($1, 'pending', 0) RETURNING id`,
      [req.user!.id]
    );
    const orderId = order.rows[0].id;

    let total = 0;
    const itemsForKitchen: { name: string; quantity: number }[] = [];
    for (const item of items) {
      const priceRes = await client.query(
        `SELECT price, name FROM menu_items WHERE id = $1 AND is_available = true`,
        [item.menuItemId]
      );
      if (!priceRes.rowCount) {
        throw new Error(`Menu item ${item.menuItemId} is not available`);
      }
      const unitPrice = Number(priceRes.rows[0].price);
      total += unitPrice * item.quantity;
      itemsForKitchen.push({ name: priceRes.rows[0].name, quantity: item.quantity });

      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.menuItemId, item.quantity, unitPrice]
      );
      await client.query(
        `UPDATE menu_items SET order_count = order_count + $1 WHERE id = $2`,
        [item.quantity, item.menuItemId]
      );
      await client.query(
        `UPDATE inventory SET stock_quantity = GREATEST(stock_quantity - $1, 0), updated_at = now()
         WHERE menu_item_id = $2`,
        [item.quantity, item.menuItemId]
      );
    }

    await client.query(`UPDATE orders SET total = $1 WHERE id = $2`, [total, orderId]);
    await client.query("COMMIT");

    if (recommendationLogId) {
      // Fire-and-forget: mark which item from the recommendation the customer actually ordered.
      recordConversion(recommendationLogId, items[0].menuItemId).catch(() => {});
    }

    const io = req.app.get("io") as Server;
    io.to("kitchen").emit("order:new", { orderId, total, items: itemsForKitchen });
    io.to("admin").emit("stats:dirty");

    res.status(201).json({ id: orderId, total, status: "pending" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

ordersRouter.get("/:id", requireAuth, async (req, res) => {
  const order = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
  if (!order.rowCount) return res.status(404).json({ error: "Order not found" });

  const items = await pool.query(
    `SELECT oi.quantity, oi.unit_price, m.name
     FROM order_items oi JOIN menu_items m ON m.id = oi.menu_item_id
     WHERE oi.order_id = $1`,
    [req.params.id]
  );
  res.json({ ...order.rows[0], items: items.rows });
});

const statusSchema = z.object({
  status: z.enum(["pending", "preparing", "ready", "completed", "cancelled"]),
});

ordersRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("staff", "owner"),
  async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { status } = parsed.data;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING customer_id`,
      [status, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Order not found" });

    const io = req.app.get("io") as Server;
    io.to(`order:${id}`).emit("order:status", { orderId: id, status });
    io.to("kitchen").emit("order:status", { orderId: id, status });
    io.to("admin").emit("stats:dirty");

    res.json({ ok: true });
  }
);
