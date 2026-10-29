# AoE4 League Manager

Season standings, round-robin schedules, and match management for a 14-player AoE4 league across three skill tiers.

## Quick Start (Local Dev)

### Prerequisites
- Node.js v22+
- pnpm (`npm install -g pnpm`)

### 1. Install dependencies
```bash
git clone <your-repo-url> LeagueManager
cd LeagueManager
pnpm install
```

### 2. Create the local database
```bash
pnpm migrate
```
This applies every file in `packages/core/src/db/migrations/` to your local D1 database (schema + seed: 14 players, 3 tiers, Season 1 with its full round-robin). It targets the same database `wrangler dev` serves, in `.wrangler/state/v3/d1`.

Already have data and want a clean slate? `pnpm seed` wipes the local database and re-applies all migrations.

### 3. Run both servers
```bash
pnpm dev
```
That starts the API (http://localhost:8787) and the frontend (http://localhost:5173) together. To run them separately:

```bash
pnpm dev:api   # Hono on Cloudflare Workers
pnpm dev:web   # React + Vite, proxies /api to the Worker on :8787
```

Open http://localhost:5173 — you should see Season 1 standings for all three tiers.

### 4. (Optional) Enable admin actions
Admin endpoints need the `ADMIN_TOKEN` secret. For local dev, create a `.dev.vars` file **next to `wrangler.jsonc`** (repo root, gitignored):
```bash
echo "ADMIN_TOKEN=dev-local-token" > .dev.vars
```
Without it, `/api/admin/*` responds `503 Admin not configured` — read-only features work fine. The ☰ menu → Log in uses the same token.

### Common commands

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run API + frontend together |
| `pnpm dev:api` / `pnpm dev:web` | Run one server |
| `pnpm migrate` | Apply pending migrations to the local D1 |
| `pnpm seed` | Wipe the local D1 and re-apply all migrations |
| `pnpm new:season` | Roll the league forward into a new season |
| `pnpm typecheck` | Typecheck all three packages |
| `pnpm build:web` | Production build of the frontend |
| `pnpm deploy:api` / `pnpm deploy:web` | Deploy to Cloudflare |

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
```bash
npx wrangler d1 migrations apply league-manager-db --remote
```
Applies every file in `packages/core/src/db/migrations/` (schema + seed) and tracks what it has applied, so re-running it is safe.

#### 4. Deploy the API Worker
```powershell
npx wrangler deploy
```
Note the Worker URL (e.g. `https://league-manager-api.andrei-35b.workers.dev`).

#### 5. Set the admin token (SECURITY — required for admin actions)
```powershell
npx wrangler secret put ADMIN_TOKEN
# Enter a long random string, e.g.: openssl rand -hex 32
```
Every `/api/admin/*` endpoint requires this value in the `X-Admin-Token` header. Until it is set, admin endpoints return `503 Admin not configured` — they fail closed, so nothing is exposed, but admin actions are unavailable. This is the same token admins type into the frontend's Log in menu.

#### 6. Set CORS origin (SECURITY — do this before deploying the frontend)
```powershell
npx wrangler secret put FRONTEND_ORIGIN
# Enter your Pages domain, e.g.: https://league-manager.pages.dev
```
This locks the API so only your frontend can call it. Without this, the API accepts requests from any origin.

#### 7. Deploy the frontend
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
Worker secrets persist across deploys — set `ADMIN_TOKEN` and `FRONTEND_ORIGIN` only once.

---

## Security Notes

1. **CORS**: The `FRONTEND_ORIGIN` environment variable controls which domain can call the API. Set it to your exact Pages URL in production. Never leave it empty in production (that allows all origins).

2. **D1 remote access**: The `wrangler.jsonc` does NOT have `"remote": true` on the D1 binding. This means `wrangler dev` uses a local database by default. If you temporarily enable remote access for debugging, remember to disable it afterward.

3. **Admin auth**: All write endpoints live under `/api/admin/*` and are guarded by a Hono middleware that requires the `X-Admin-Token` header to match the `ADMIN_TOKEN` Worker secret. A missing/mismatched token returns `401`; an unset secret returns `503` (fail-closed). There are no user accounts, per-user roles, or expiry — the single shared token grants full admin rights, so share it only with trusted league admins. Read endpoints (standings, players, matches) are public by design.

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
│   │       └── routes/          ← seasons, players, matches, standings, admin
│   │
│   └── web/            ← React frontend
│       └── src/
│           ├── api/client.ts    ← Typed API client
│           ├── components/      ← StandingsTable, ScheduleView, SeasonPicker
│           ├── context/         ← AdminContext, SeasonsContext
│           └── pages/           ← SeasonPage, PlayerPage, PlayersPage
│
├── scripts/
│   ├── generate-matches.ts   ← Generates a round-robin bracket for a season
│   └── reset-local-db.mjs    ← Wipes the local D1 database
│
├── wrangler.jsonc       ← Worker config (update DB ID before deploy)
└── packages/core/src/db/migrations/  ← SQL migrations (schema + seed)
```

---

## Starting a New Season

`pnpm new:season` rolls the league forward in a single transaction: it closes the current season, opens the new one, carries the roster over (applying any promotions and relegations), copies the per-season rules and draft presets, regenerates the round-robin bracket, and records every roster change in `season_transitions`.

```bash
# New season, everyone stays in their tier
pnpm new:season

# New season with a promotion and a relegation
pnpm new:season --promote 9:code_a:code_s --relegate 4:code_s:code_a

# Custom season number, best-of format, and notes
pnpm new:season --number 3 --best-of 5 --notes "Double elimination"

# See the plan without writing anything
pnpm new:season --dry-run
```

Options: `--from <seasonId>` (source season, default the active one), `--number <n>`, `--best-of <3|5>`, `--notes "<text>"`, `--promote <id>:<from>:<to>`, `--relegate <id>:<from>:<to>`, `--dry-run`.

It writes to the local database and also emits `scripts/output/new-season-<n>.sql` with the equivalent statements, so the same change can be applied to the remote database:

```bash
npx wrangler d1 execute league-manager-db --remote --file=scripts/output/new-season-2.sql
```

The old season stays fully intact — its standings, results, and schedule remain viewable through the season picker.

---

## Browsing Seasons

The season picker in the top-right of the nav switches between every season in the database. Each season is addressable directly at `/season/:id`; `/` resolves to the active season, falling back to the most recent.

- Completed seasons are badged **Archived**; the active one shows **In Progress**.
- A player's match history spans all seasons, with each entry tagged `S1`, `S2`, … so past matches stay distinguishable from current ones.
- A match's breadcrumb links back to the season it belongs to, not just the latest one.

Nothing is deleted between seasons — standings, results, and rosters are all keyed by `season_id`, so an archived season renders exactly as it did when it was live.

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

### Admin endpoints (require `X-Admin-Token`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/verify` | Validate a token (used by the frontend login) |
| POST | `/api/admin/matches/:id/report` | Report per-game results for a match |
| POST | `/api/admin/matches/:id/clear` | Clear a match's results and reset it to pending |
| POST | `/api/admin/matches/:id/schedule` | Set a match's scheduled time |

---

## What's Next

**Increment 2** (after launch): Admin endpoints for reporting match results manually, so scores can be entered while the full wizard is built. *(Done — see the admin endpoints table above.)*

**Increment 3**: Match wizard — the TurboTax-style guided flow with aoe2cm.net integration for map/civ drafts.

**Season rollover tooling**: starting a new season used to be manual SQL — close the old season, insert the new one, move the roster, copy the rules and presets, then generate the bracket. *(Done — see `pnpm new:season` above.)*

**Still manual**: player management (adding, retiring, or moving a player between seasons) has no endpoint or script yet. The `players.active` flag exists but nothing writes to it.
