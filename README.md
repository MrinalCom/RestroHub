# RestroHub

A full-stack restaurant management & ordering platform: customers browse the menu and order
online, kitchen staff work off a live order queue, and the owner manages the menu, pricing, and
inventory from a dashboard. AI is embedded as a feature — a mood-based dish recommender — rather
than being the whole product.

## Stack

- **Frontend**: Next.js (App Router)
- **Backend**: Node/Express + TypeScript
- **DB**: Postgres
- **Cache/session store**: Redis
- **Real-time**: Socket.io (order status pushed to kitchen display + customer)
- **AI**: Claude API (Anthropic) for structured mood → craving-profile extraction
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

## Project structure

```
backend/
  src/
    config/       # Postgres + Redis clients
    db/init.sql   # schema + seed data
    middleware/   # JWT auth (required + optional)
    routes/       # auth, menu, orders, reservations, recommend
    services/     # claude.service.ts (LLM call), recommend.service.ts (ranking)
    sockets/      # Socket.io rooms for kitchen + per-order updates
frontend/
  app/
    page.tsx          # customer menu + mood picker
    admin/page.tsx     # owner dashboard
    kitchen/page.tsx   # live order queue
    components/        # MoodPicker, MenuGrid
docker-compose.yml
```

## What's intentionally left as a next step

- Password reset / email verification
- Table/seat management beyond simple reservation records
- Payment integration (Stripe et al.)
- A production Dockerfile (multi-stage build) — current Dockerfiles run `dev` mode for hot reload
- Swapping the hand-tuned ranking weights for a learned model once there's enough conversion data
