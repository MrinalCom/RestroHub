# RestroHub

A full-stack restaurant management & ordering platform: customers browse the menu, get mood-based
recommendations, add dishes to a cart, check out, and watch their order move through the kitchen
live; kitchen staff work off a live order queue; the owner manages the menu, pricing, inventory,
and review sentiment from a dashboard. AI is embedded as a feature — a mood-based dish recommender,
a concierge chat agent, a review-sentiment aggregator — rather than being the whole product.

## Stack

- **Frontend**: Next.js (App Router)
- **Backend**: Node/Express + TypeScript
- **DB**: Postgres
- **Cache/session store**: Redis
- **Real-time**: Socket.io (order status pushed to kitchen display + customer)
- **AI**: Claude API (Anthropic) for structured mood → craving-profile extraction, plus a
  LangGraph tool-calling agent for open-ended concierge chat
- **Scraping**: Python (BeautifulSoup + requests), invoked as a subprocess, for the owner-side
  review-sentiment aggregator
- **Orchestration**: Docker Compose

## Getting started

1. Copy the env template and fill in your Anthropic API key:
   ```
   cp .env.example .env
   ```
   Note: a **Claude Pro** subscription (claude.ai) is separate from **API access**. You need a
   key from [console.anthropic.com](https://console.anthropic.com) — it bills per token,
   independent of any Pro plan.

2. Bring up the stack:
   ```
   docker compose up --build
   ```

3. Open:
   - Customer site: http://localhost:3000
   - Kitchen display: http://localhost:3000/kitchen
   - Owner dashboard: http://localhost:3000/admin
   - Backend health check: http://localhost:4000/health

4. Register a user via `POST /api/auth/register` with `"role": "owner"` (or `"staff"`) to unlock
   the admin/kitchen actions — the seed data ships with menu items but no users.

## Why the mood recommender is more than "call an LLM"

The flagship AI feature — "suggest dishes based on how I'm feeling" — is built as a small
recommendation system, not a chat wrapper, because that's the shape of problem personalization
and search-relevance teams (the kind you'd find at Amazon or Flipkart) actually work on:

1. **Structured extraction, not free text.** Claude is called with a forced tool-use schema, so
   the mood description ("stressed, want comfort food") becomes a deterministic 5-dimension
   vector (`comfort/spicy/light/sweet/energizing`), not a string you'd have to regex-parse.
2. **Explainable similarity.** Each dish has the same 5-dimension profile, and matching is plain
   cosine similarity — interpretable, not a black-box embedding.
3. **Hybrid ranking.** The final score blends semantic match with real business signals
   (popularity, stock) — pure LLM similarity alone tends to surface obscure items nobody
   actually orders. See `backend/src/services/recommend.service.ts`.
4. **Cache the right layer.** Redis caches the *LLM extraction step* (expensive, repeats a lot —
   "tired", "stressed" show up constantly), not the final ranked list, since popularity/stock
   shift independently of mood.
5. **A feedback loop.** Every recommendation is logged (`mood_recommendation_logs`), and if the
   customer orders one of the suggested dishes, that gets recorded as a conversion. That log is
   exactly the training data a real learned ranker (logistic regression / GBDT over the same
   features) would replace the hand-tuned 0.7/0.3 weights with — the natural "phase 2."

## Beyond the single LLM call

Two more AI-touching features layer on top of the mood recommender, each solving a different
shaped problem:

1. **A LangGraph concierge agent** (`backend/src/agents/`). The mood recommender is a single
   forced tool-call — great when you already know the shape of the answer. The concierge
   (`POST /api/concierge/chat`) handles open-ended requests ("something spicy under $12" mixes a
   mood *and* a hard constraint) via a LangGraph `createReactAgent` that autonomously decides
   between two tools: `match_mood` (wraps the existing hybrid ranker) and `search_menu` (a direct
   category/price filter). The agent only chooses *which* tool to call and how to phrase the
   answer — ranking math and DB access stay in `recommend.service.ts`, and `customerId` is closed
   over server-side rather than trusted as an LLM-supplied argument.
2. **A BeautifulSoup review-sentiment aggregator** (`backend/scripts/scrape_reviews.py`,
   owner-only `POST /api/reviews/scrape`). Rather than reimplementing HTML parsing in JS, a small
   Python subprocess (robots.txt-respecting, single-request, no crawling) pulls review-shaped text
   blocks out of an owner-supplied URL; Claude then extracts overall sentiment, recurring
   positive/negative themes, and a per-review label via the same forced-tool-use pattern as the
   craving-profile extractor. Results land in `review_scrapes` and render as a chart card on the
   owner dashboard.
3. **A no-LLM fallback** (`backend/src/services/fallback*.service.ts`). If Claude is unreachable,
   `/api/concierge/chat` and `/api/recommend/mood` don't just error out — a Fuse.js fuzzy matcher
   answers FAQs (hours, location, contact) with no training data, and a keyword-to-craving-vector
   guesser feeds the *same* `rankMenuByProfile` cosine-similarity math the real recommender uses,
   just with a cruder input vector. The chat widget flags these replies with a small "Basic mode"
   tag so it's never pretending to be smarter than it is.
4. **A chat widget** (`frontend/app/components/ChatWidget.tsx`), floating on every page, is the
   concierge agent's actual UI: it resends the full conversation each turn (no server-side session
   state), shows a typing indicator, and surfaces the "Basic mode" tag whenever a reply came from
   the no-LLM fallback above instead of Claude.

## Ordering & live tracking

Customers can now actually place an order, not just browse — `MenuGrid`'s "Add" button used to be
unwired to anything. The pieces:

- **Cart** (`frontend/app/lib/CartContext.tsx`): localStorage-persisted, global via context (same
  pattern as `AuthContext.tsx`), so the nav cart badge and the drawer both read from the one
  source of truth regardless of which page added an item.
- **Checkout** (`frontend/app/components/CartDrawer.tsx`): a slide-in drawer that posts to the
  existing `POST /api/orders`, carrying `recommendationLogId` when the cart contains a
  mood-recommended dish so the conversion feedback loop (see above) still closes.
- **Live tracking** (`frontend/app/orders/[id]/page.tsx`): the backend already had `order:watch` /
  `order:unwatch` Socket.io handlers (`backend/src/sockets/orderSocket.ts`) built for exactly this
  and nothing was using them — the tracking page joins that room and updates its status stepper
  live as kitchen staff advance the order, no polling or refresh.
- Fixed alongside this: `GET /api/orders/:id` had no ownership check — any authenticated user
  could fetch any order by ID. It's now scoped to the order's own customer (staff/owner keep full
  access, matching every other staff-facing endpoint).

## Project structure

```
backend/
  src/
    config/       # Postgres + Redis clients
    db/init.sql   # schema + seed data
    middleware/   # JWT auth (required + optional)
    routes/       # auth, menu, orders, reservations, recommend, concierge, reviews
    services/     # claude.service.ts (LLM calls), recommend.service.ts (ranking),
                  # reviewScraper.service.ts / reviewInsights.service.ts (scrape + analyze)
    agents/       # LangGraph concierge agent + its tools
    sockets/      # Socket.io rooms for kitchen + per-order updates
  scripts/        # scrape_reviews.py — BeautifulSoup review scraper
frontend/
  app/
    page.tsx            # customer menu, mood picker, cart wiring
    admin/page.tsx       # owner dashboard (charts + review sentiment)
    kitchen/page.tsx     # live order queue
    orders/[id]/page.tsx # live order tracking (Socket.io)
    lib/                 # AuthContext, CartContext (both localStorage-backed)
    components/          # MoodPicker, MenuGrid, ChatWidget, CartDrawer, NavBar, ...
docker-compose.yml
```

## What's intentionally left as a next step

- Password reset / email verification
- Table/seat management beyond simple reservation records
- A reservations *booking UI* — `POST`/`GET /api/reservations` already exist and work, there's
  just no frontend calling them yet
- A customer-facing order-history list (today a customer can track the order they just placed via
  its URL, but there's no "my past orders" view)
- Payment integration (Stripe et al.)
- Automated tests and a real CI pipeline — the repo currently has a leftover `deno.yml` GitHub
  Actions workflow unrelated to this stack (it's a Node/TS project, not Deno) and no test suite
- A production Dockerfile (multi-stage build) — current Dockerfiles run `dev` mode for hot reload
- Swapping the hand-tuned ranking weights for a learned model once there's enough conversion data
