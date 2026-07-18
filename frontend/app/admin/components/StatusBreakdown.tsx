"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

interface StatusCount {
  status: string;
  count: number;
}

// Validated against the dark chart surface with scripts/validate_palette.js (dataviz skill):
// first 4 slots of the fixed categorical order for workflow stages, plus the reserved
// "critical" status color for cancelled — a genuine negative outcome, not just another category.
const STATUS_COLOR: Record<string, string> = {
  pending: "#3987e5",
  preparing: "#008300",
  ready: "#d55181",
  completed: "#c98500",
  cancelled: "#d03b3b",
};

const ORDER = ["pending", "preparing", "ready", "completed", "cancelled"];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as StatusCount;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-value">{p.count}</div>
      <div className="chart-tooltip-label" style={{ textTransform: "capitalize" }}>
        {p.status}
      </div>
    </div>
  );
}

export default function StatusBreakdown({ data }: { data: StatusCount[] }) {
  const byStatus = new Map(data.map((d) => [d.status, d.count]));
  const ordered = ORDER.map((status) => ({
    status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    count: byStatus.get(status) ?? 0,
  }));

  return (
    <div className="chart-card">
      <h3 className="chart-title">Orders by status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={ordered}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          barCategoryGap={10}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={80}
            tick={{ fill: "#b3a894", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(203,160,80,0.06)" }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {ordered.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
            ))}
            <LabelList
              dataKey="count"
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
