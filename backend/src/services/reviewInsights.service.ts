import { pool } from "../config/db.js";
import { scrapeReviewPage } from "./reviewScraper.service.js";
import { analyzeReviews, ReviewSentiment } from "./claude.service.js";

export interface ReviewScrapeSummary {
  id: string;
  sourceUrl: string;
  reviewCount: number;
  overallSentiment: string;
  positiveThemes: string[];
  negativeThemes: string[];
  summary: string;
  sentimentBreakdown: Record<ReviewSentiment, number>;
  createdAt: string;
}

export async function scrapeAndAnalyze(url: string): Promise<ReviewScrapeSummary> {
  const { reviews } = await scrapeReviewPage(url);
  if (reviews.length === 0) {
    throw new Error("No review-shaped text found on that page");
  }

  const insights = await analyzeReviews(reviews);

  const sentimentBreakdown: Record<ReviewSentiment, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const r of insights.perReview) {
    sentimentBreakdown[r.sentiment] = (sentimentBreakdown[r.sentiment] ?? 0) + 1;
  }

  const result = await pool.query(
    `INSERT INTO review_scrapes
       (source_url, review_count, overall_sentiment, positive_themes, negative_themes, summary, sentiment_breakdown)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, source_url, review_count, overall_sentiment, positive_themes,
               negative_themes, summary, sentiment_breakdown, created_at`,
    [
      url,
      reviews.length,
      insights.overallSentiment,
      JSON.stringify(insights.positiveThemes),
      JSON.stringify(insights.negativeThemes),
      insights.summary,
      JSON.stringify(sentimentBreakdown),
    ]
  );

  return rowToSummary(result.rows[0]);
}

export async function getLatestReviewScrape(): Promise<ReviewScrapeSummary | null> {
  const result = await pool.query(
    `SELECT id, source_url, review_count, overall_sentiment, positive_themes,
            negative_themes, summary, sentiment_breakdown, created_at
     FROM review_scrapes
     ORDER BY created_at DESC
     LIMIT 1`
  );
  return result.rows[0] ? rowToSummary(result.rows[0]) : null;
}

function rowToSummary(row: {
  id: string;
  source_url: string;
  review_count: number;
  overall_sentiment: string;
  positive_themes: string[];
  negative_themes: string[];
  summary: string;
  sentiment_breakdown: Record<ReviewSentiment, number>;
  created_at: Date;
}): ReviewScrapeSummary {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    reviewCount: row.review_count,
    overallSentiment: row.overall_sentiment,
    positiveThemes: row.positive_themes,
    negativeThemes: row.negative_themes,
    summary: row.summary,
    sentimentBreakdown: row.sentiment_breakdown,
    createdAt: row.created_at.toISOString(),
  };
}
