import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const reservationsRouter = Router();

const createSchema = z.object({
  partySize: z.number().int().positive(),
  reservedFor: z.string().datetime(),
});

reservationsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { partySize, reservedFor } = parsed.data;

  const result = await pool.query(
    `INSERT INTO reservations (customer_id, party_size, reserved_for)
     VALUES ($1, $2, $3) RETURNING id, party_size, reserved_for, status`,
    [req.user!.id, partySize, reservedFor]
  );
  res.status(201).json(result.rows[0]);
});

reservationsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const isStaff = req.user!.role === "staff" || req.user!.role === "owner";
  const result = await pool.query(
    isStaff
      ? `SELECT * FROM reservations ORDER BY reserved_for ASC`
      : `SELECT * FROM reservations WHERE customer_id = $1 ORDER BY reserved_for ASC`,
    isStaff ? [] : [req.user!.id]
  );
  res.json(result.rows);
});
