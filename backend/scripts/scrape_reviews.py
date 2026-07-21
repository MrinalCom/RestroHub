#!/usr/bin/env python3
"""
Fetches a single owner-supplied URL and pulls out review-shaped text blocks with
BeautifulSoup. Invoked by reviewScraper.service.ts as a subprocess; talks JSON on
stdout so the Node side doesn't need to parse HTML at all.

Deliberately single-page, robots.txt-respecting, and rate-limited to one request —
this is a manual "analyze this page" tool the owner points at a URL they choose,
not a crawler.
"""
import json
import re
import sys
import urllib.robotparser
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

USER_AGENT = "RestroHub-ReviewAggregator/1.0 (+owner-triggered single-page fetch)"
MIN_LEN = 40
MAX_LEN = 1000
MAX_SNIPPETS = 30
TIMEOUT_SECONDS = 10


def fail(message: str) -> None:
    print(json.dumps({"error": message}))
    sys.exit(1)


def robots_allow(url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = urllib.robotparser.RobotFileParser()
    try:
        parser.set_url(robots_url)
        parser.read()
        return parser.can_fetch(USER_AGENT, url)
    except Exception:
        # If robots.txt itself is unreachable, don't block on that alone.
        return True


def extract_snippets(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "nav", "header", "footer", "noscript", "svg"]):
        tag.decompose()

    seen: set[str] = set()
    snippets: list[str] = []

    for el in soup.find_all(["p", "blockquote", "li", "div", "span"]):
        text = el.get_text(" ", strip=True)
        text = re.sub(r"\s+", " ", text)
        if not (MIN_LEN <= len(text) <= MAX_LEN):
            continue
        if text in seen:
            continue
        seen.add(text)
        snippets.append(text)
        if len(snippets) >= MAX_SNIPPETS:
            break

    return snippets


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: scrape_reviews.py <url>")

    url = sys.argv[1]
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        fail("invalid url")

    if not robots_allow(url):
        fail("robots.txt disallows fetching this URL")

    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_SECONDS)
        resp.raise_for_status()
    except requests.RequestException as exc:
        fail(f"fetch failed: {exc}")

    snippets = extract_snippets(resp.text)
    print(json.dumps({"url": url, "count": len(snippets), "reviews": snippets}))


if __name__ == "__main__":
    main()
