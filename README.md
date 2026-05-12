# AoE4 League Manager

Season standings, round-robin schedules, and match management for a 14-player AoE4 league across three skill tiers.

## Quick Start (Local Dev)

### Prerequisites
- Node.js v22+
- pnpm (`npm install -g pnpm`)

### 1. Install dependencies
```powershell
cd C:\Users\andre\Documents\LeagueManager
pnpm install
```

### 2. Create the local database
```powershell
# Apply schema
npx wrangler d1 execute league-manager-db --local --file=packages/core/src/db/migrations/001_initial.sql

# Apply seed data (14 players, 3 tiers, Season 1 with all matches)
npx wrangler d1 execute league-manager-db --local --file=packages/core/src/db/migrations/002_seed.sql
```

### 3. Run locally
```powershell
# Terminal 1: API (Hono on Cloudflare Worker)
cd packages/api
pnpm dev
# → http://localhost:8787

# Terminal 2: Frontend (React + Vite)
cd packages/web
pnpm dev
# → http://localhost:5173 (proxies /api to Worker)
```

Open http://localhost:5173 — you should see Season 1 standings for all three tiers.

---

## Deploy to Cloudflare

### First-time setup

#### 1. Create the D1 database
```powershell
npx wrangler d1 create league-manager-db
```
This prints a `database_id`. Copy it.

#### 2. Update wrangler.jsonc
Replace `REPLACE_AFTER_D1_CREATE` with your actual database ID.

#### 3. Apply migrations to remote D1
```powershell
npx wrangler d1 execute league-manager-db --remote --file=packages/core/src/db/migrations/001_initial.sql
npx wrangler d1 execute league-manager-db --remote --file=packages/core/src/db/migrations/002_seed.sql
```

#### 4. Deploy the API Worker
```powershell
npx wrangler deploy
```
Note the Worker URL (e.g. `https://league-manager-api.andrei-35b.workers.dev`).

#### 5. Set CORS origin (SECURITY — do this before deploying the frontend)
```powershell
npx wrangler secret put FRONTEND_ORIGIN
# Enter your Pages domain, e.g.: https://league-manager.pages.dev
```
This locks the API so only your frontend can call it. Without this, the API accepts requests from any origin.

#### 6. Deploy the frontend
```powershell
cd packages/web

# Set the API URL for the frontend build
# On Windows PowerShell:
$env:VITE_API_BASE_URL = "https://league-manager-api.andrei-35b.workers.dev"

pnpm build
npx wrangler pages deploy dist --project-name=league-manager
```

### Subsequent deploys
```powershell
# API changes
npx wrangler deploy

# Frontend changes
cd packages/web
pnpm build
npx wrangler pages deploy dist --project-name=league-manager
```

---

## Security Notes

1. **CORS**: The `FRONTEND_ORIGIN` environment variable controls which domain can call the API. Set it to your exact Pages URL in production. Never leave it empty in production (that allows all origins).

2. **D1 remote access**: The `wrangler.jsonc` does NOT have `"remote": true` on the D1 binding. This means `wrangler dev` uses a local database by default. If you temporarily enable remote access for debugging, remember to disable it afterward.

3. **No auth yet**: The current API is read-only (standings, players, matches). Write endpoints (wizard, admin) will be added in the next increment and will need authentication. The plan's v1 approach (trust 12 people who know each other) is reasonable for launch, with Discord OAuth or player PINs added later.

4. **Input validation**: All route parameters are parsed with `parseInt()` and validated before use. No raw user input reaches SQL queries — all queries use parameterized bindings via D1's `.bind()`.

---

## Project Structure

```
LeagueManager/
├── packages/
│   ├── core/           ← Pure logic, zero platform deps
│   │   └── src/
│   │       ├── db/migrations/   ← SQL migration files
│   │       ├── league/          ← Round-robin, standings
│   │       └── types/           ← Shared TypeScript types
│   │
│   ├── api/            ← Hono Worker (API)
│   │   └── src/
│   │       ├── app.ts           ← Shared app factory
│   │       ├── worker.ts        ← Worker entrypoint
│   │       └── routes/          ← seasons, players, matches, standings
│   │
│   └── web/            ← React frontend
│       └── src/
│           ├── api/client.ts    ← Typed API client
│           ├── components/      ← StandingsTable, ScheduleView
│           └── pages/           ← SeasonPage, PlayerPage, PlayersPage
│
├── scripts/
│   └── migrate.ts      ← Local SQLite migration runner
│
├── wrangler.jsonc       ← Worker config (update DB ID before deploy)
└── data/local.db        ← Local dev database (gitignored)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/seasons` | List all seasons |
| GET | `/api/seasons/:id` | Season detail with tiers |
| GET | `/api/tiers` | Static tier reference data |
| GET | `/api/standings/:seasonId` | Full standings + schedule for all tiers |
| GET | `/api/players` | All active players |
| GET | `/api/players/:id` | Player detail with match history |
| GET | `/api/seasons/:seasonId/matches?tier=` | Matches for a season (optional tier filter) |
| GET | `/api/matches/:id` | Match detail with games |

---

## What's Next

**Increment 2** (after launch): Admin endpoints for reporting match results manually, so scores can be entered while the full wizard is built.

**Increment 3**: Match wizard — the TurboTax-style guided flow with aoe2cm.net integration for map/civ drafts.
