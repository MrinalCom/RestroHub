"use client";

import { motion } from "framer-motion";

interface MoodConversion {
  totalRecommendations: number;
  converted: number;
  conversionRate: number;
}

export default function ConversionFunnel({ data }: { data: MoodConversion }) {
  const pct = Math.min(100, Math.max(0, data.conversionRate));

  return (
    <div className="chart-card">
      <h3 className="chart-title">AI mood-match conversion</h3>
      <div className="funnel-hero">{pct.toFixed(1)}%</div>
      <div className="funnel-meter">
        <motion.div
          className="funnel-meter-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="funnel-stats">
        <div>
          <span className="funnel-stat-value">{data.totalRecommendations}</span>
          <span className="funnel-stat-label">recommendations shown</span>
        </div>
        <div>
          <span className="funnel-stat-value">{data.converted}</span>
          <span className="funnel-stat-label">converted to an order</span>
        </div>
      </div>
    </div>
  );
}
