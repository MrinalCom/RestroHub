import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);

const SCRIPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../scripts/scrape_reviews.py"
);

interface ScrapeResult {
  url: string;
  count: number;
  reviews: string[];
}

/**
 * Shells out to the Python/BeautifulSoup scraper rather than reimplementing HTML
 * parsing in Node — bs4's tag/heuristic API is a better fit for "find review-shaped
 * text on an arbitrary page" than a JS DOM parser would be for a one-off script.
 */
export async function scrapeReviewPage(url: string): Promise<ScrapeResult> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("python3", [SCRIPT_PATH, url], {
      timeout: 20_000,
      maxBuffer: 5 * 1024 * 1024,
    }));
  } catch (err) {
    const stderrOut = (err as { stderr?: string }).stderr;
    const stdoutOut = (err as { stdout?: string }).stdout;
    throw new Error(parseErrorMessage(stdoutOut ?? stderrOut ?? (err as Error).message));
  }

  const parsed = JSON.parse(stdout) as ScrapeResult | { error: string };
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  return parsed;
}

function parseErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === "string") return parsed.error;
  } catch {
    // fall through to raw message below
  }
  return raw.trim() || "Scraper failed";
}
