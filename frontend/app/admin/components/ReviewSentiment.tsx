"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#1f7a44",
  neutral: "#ad7c33",
  negative: "#b23b2e",
};

interface ReviewScrapeSummary {
  id: string;
  sourceUrl: string;
  reviewCount: number;
  overallSentiment: string;
  positiveThemes: string[];
  negativeThemes: string[];
  summary: string;
  sentimentBreakdown: Record<string, number>;
  createdAt: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; count: number };
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-value">{p.count}</div>
      <div className="chart-tooltip-label">{p.label}</div>
    </div>
  );
}

export default function ReviewSentiment({ token }: { token: string }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewScrapeSummary | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/reviews/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => {});
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/reviews/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scrape failed");
      setSummary(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const chartData = summary
    ? ["positive", "neutral", "negative"].map((s) => ({
        status: s,
        label: s.charAt(0).toUpperCase() + s.slice(1),
        count: summary.sentimentBreakdown[s] ?? 0,
      }))
    : [];

  return (
    <div className="chart-card">
      <h3 className="chart-title">Review sentiment</h3>

      <form className="scrape-form" onSubmit={submit}>
        <input
          type="url"
          placeholder="https://example.com/reviews"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Scraping…" : "Scrape reviews"}
        </button>
      </form>

      {error && <p className="auth-error" style={{ marginBottom: "1rem" }}>{error}</p>}

      {summary ? (
        <>
          <p className="review-meta">
            {summary.reviewCount} snippets · {summary.sourceUrl} ·{" "}
            {new Date(summary.createdAt).toLocaleDateString()}
          </p>
          <p className="review-summary">{summary.summary}</p>

          <ResponsiveContainer width="100%" height={110}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              barCategoryGap={10}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={70}
                tick={{ fill: "#54565f", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(173,124,51,0.06)" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={SENTIMENT_COLOR[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {summary.positiveThemes.length > 0 && (
            <div className="badge-row" style={{ marginTop: "0.75rem" }}>
              {summary.positiveThemes.map((t) => (
                <span key={t} className="badge">
                  {t}
                </span>
              ))}
            </div>
          )}
          {summary.negativeThemes.length > 0 && (
            <div className="badge-row">
              {summary.negativeThemes.map((t) => (
                <span key={t} className="badge badge-negative">
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="review-summary">No scrape yet — paste a URL above to analyze its reviews.</p>
      )}
    </div>
  );
}
