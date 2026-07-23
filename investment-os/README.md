# Investment OS

An end-to-end research platform for the Indian markets: it collects market &
company data, stores it in PostgreSQL, scores companies with a knowledge-driven
AI layer, and surfaces everything through a React dashboard.

> ⚠️ **Educational / research tooling — not financial advice.** AI scores and
> summaries are model-generated opinions, not recommendations to buy or sell.

## Monorepo layout

```
investment-os/
├── backend/            Node.js + Express API, Prisma ORM
│   ├── prisma/         Database schema & migrations (Phase 2)
│   └── src/
│       ├── routes/     REST endpoints (Phases 4–11)
│       ├── api/        External data collectors (Phase 3)
│       ├── ai/         Scoring / summary engine (Phase 8)
│       ├── scheduler/  Daily automation jobs (Phase 12)
│       ├── knowledge/  Per-company knowledge JSON (Phase 7 ⭐)
│       ├── config/     Prisma client, env
│       └── utils/      Shared helpers
└── frontend/           React + Tailwind + Vite dashboard
    └── src/
        ├── pages/      Home, Market, Company, Portfolio, AI Chat, …
        ├── components/ Sidebar, cards, tables
        └── api/        Typed API client
```

## Tech stack

| Layer     | Choice                          |
| --------- | ------------------------------- |
| Frontend  | React 18, Tailwind CSS, Vite    |
| Backend   | Node.js, Express                |
| Database  | PostgreSQL                      |
| ORM       | Prisma                          |
| Scheduler | node-cron                       |

## The 12 phases

| Phase | Area              | Where it lives                                   | Status |
| ----- | ----------------- | ------------------------------------------------ | ------ |
| 1     | Project setup     | this monorepo                                    | ✅ scaffold |
| 2     | Database design   | `backend/prisma/schema.prisma`                   | ✅ schema |
| 3     | Data collection   | `backend/src/api/*`                              | 🔌 stubbed collectors |
| 4     | Dashboard         | `frontend/src/pages/Home.jsx`                    | ✅ UI |
| 5     | Company page      | `frontend/src/pages/Company.jsx`                 | ✅ UI |
| 6     | Portfolio         | `frontend/src/pages/Portfolio.jsx` + routes      | ✅ UI + calc |
| 7 ⭐  | Knowledge engine  | `backend/src/knowledge/*.json`                   | ✅ seed data |
| 8     | AI scoring        | `backend/src/ai/scoreEngine.js`                  | ✅ heuristic engine |
| 9     | Alerts            | `backend/src/routes/alerts.js`                   | ✅ rules |
| 10    | Search            | `backend/src/routes/search.js`                   | ✅ endpoint |
| 11    | AI chat           | `backend/src/routes/ai.js` + `AIChat.jsx`        | ✅ endpoint + UI |
| 12    | Automation        | `backend/src/scheduler/dailyJobs.js`             | ✅ cron jobs |

Legend: ✅ implemented in scaffold · 🔌 stubbed (returns mock data until real API
keys are wired in) · ⭐ the most important layer.

## Getting started

Requires Node 18+ and a PostgreSQL instance (a `docker-compose.yml` is provided).

```bash
# 0. Start Postgres (optional, docker)
docker compose up -d

# 1. Backend
cd backend
cp ../.env.example .env         # then edit DATABASE_URL / API keys
npm install
npm run db:generate             # prisma generate
npm run db:push                 # create tables
npm run seed                    # load knowledge JSON + demo companies
npm run dev                     # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The frontend proxies `/api` to the backend, so both must be running.

## Live auto-refreshing dashboard 🖥️

Besides the React app, the backend serves a **standalone single-file dashboard**
at **http://localhost:4000** (`backend/public/index.html`). Open it in any
browser — no build step. It pulls market overview, top gainers/losers, market
health, portfolio, watchlist, alerts, AI scores, news and macro/commodities into
one page and **auto-refreshes every hour** (with a manual "Refresh now" button
and a live "last updated" status).

To keep the underlying data fresh on the same cadence, run the scheduler:

```bash
cd backend
npm run scheduler   # full routine weekdays 08:30 IST + hourly data refresh at :00
```

The page polls hourly on the client; the scheduler updates the database hourly on
the server — together they keep the dashboard current without any manual step.

## Data collectors (Phase 3)

`backend/src/api/*` wrap the external sources. Each collector returns **mock data
by default** and only calls the real provider when the matching API key is present
in `.env`. This keeps the app fully runnable offline. Sources covered:

- Stock price, quarter results, financials, shareholding, company news
- Index data: Nifty, Sensex, FII/DII, VIX
- Macro: GDP, inflation, RBI rate, USD/INR
- Commodities: Gold, Silver, Oil

## Disclaimer

This project does not provide trading signals or financial advice. AI outputs are
probabilistic and may be wrong. Do your own research.
