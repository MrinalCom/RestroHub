"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Point {
  day: string;
  revenue: number;
}

const GOLD = "#e4c07c";

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{formatDay(label)}</div>
      <div className="chart-tooltip-value">${Number(payload[0].value).toFixed(2)}</div>
    </div>
  );
}

export default function RevenueChart({ data }: { data: Point[] }) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">Revenue — last 14 days</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.25} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(203,160,80,0.12)" />
          <XAxis
            dataKey="day"
            tickFormatter={formatDay}
            tick={{ fill: "#766c5c", fontSize: 11 }}
            axisLine={{ stroke: "rgba(203,160,80,0.18)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#766c5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(203,160,80,0.35)" }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={GOLD}
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 4, stroke: "#1c1813", strokeWidth: 2, fill: GOLD }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
