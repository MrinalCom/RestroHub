import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const statsRouter = Router();

statsRouter.get("/dashboard", requireAuth, requireRole("owner"), async (_req, res) => {
  const [overview, revenueTimeseries, topDishes, statusBreakdown, moodConversion] =
    await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0) AS total_revenue,
          COUNT(*) FILTER (WHERE status != 'cancelled') AS total_orders,
          COALESCE(AVG(total) FILTER (WHERE status != 'cancelled'), 0) AS avg_order_value,
          COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) AS active_orders
        FROM orders
      `),
      pool.query(`
        SELECT d::date AS day, COALESCE(SUM(o.total), 0) AS revenue
        FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS d
        LEFT JOIN orders o
          ON date_trunc('day', o.created_at) = d AND o.status != 'cancelled'
        GROUP BY d
        ORDER BY d
      `),
      pool.query(`
        SELECT id, name, order_count
        FROM menu_items
        ORDER BY order_count DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM orders
        GROUP BY status
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total_recommendations,
          COUNT(*) FILTER (WHERE converted_item_id IS NOT NULL) AS converted
        FROM mood_recommendation_logs
      `),
    ]);

  const ov = overview.rows[0];
  const mc = moodConversion.rows[0];
  const totalRecommendations = Number(mc.total_recommendations);
  const converted = Number(mc.converted);

  res.json({
    overview: {
      totalRevenue: Number(ov.total_revenue),
      totalOrders: Number(ov.total_orders),
      avgOrderValue: Number(ov.avg_order_value),
      activeOrders: Number(ov.active_orders),
    },
    revenueTimeseries: revenueTimeseries.rows.map((r) => ({
      day: r.day,
      revenue: Number(r.revenue),
    })),
    topDishes: topDishes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      orderCount: Number(r.order_count),
    })),
    statusBreakdown: statusBreakdown.rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
    })),
    moodConversion: {
      totalRecommendations,
      converted,
      conversionRate: totalRecommendations > 0 ? (converted / totalRecommendations) * 100 : 0,
    },
  });
});
