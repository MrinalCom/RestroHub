"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

interface Dish {
  id: string;
  name: string;
  orderCount: number;
}

const GOLD = "#e4c07c";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Dish;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-value">{p.orderCount} orders</div>
      <div className="chart-tooltip-label">{p.name}</div>
    </div>
  );
}

export default function TopDishesChart({ data }: { data: Dish[] }) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">Top 5 dishes</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          barCategoryGap={10}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: "#b3a894", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(203,160,80,0.06)" }} />
          <Bar dataKey="orderCount" fill={GOLD} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList
              dataKey="orderCount"
              position="right"
              fill="#f4ede1"
              fontSize={12}
              formatter={(v: unknown) => (typeof v === "number" && v > 0 ? v : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
