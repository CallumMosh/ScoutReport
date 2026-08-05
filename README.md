# The Recruitment Room

A claret-&-blue football scouting tool. Type a player's name and it runs a **live web search** (via Google's Gemini API with Search grounding), then writes a detailed, up-to-date dossier — biometrics, a football-finance block, a 12-attribute radar, ~14 per-90 stats (with the season they're from), playing style, strengths/weaknesses, career trajectory, development projection, comparable players, and a **West Ham fit** score broken into five sub-scores. Save dossiers to a shelf and compare any two side-by-side.

Built with Next.js (App Router) + TypeScript + Recharts. The Gemini key is used only in a **server route**, so it never reaches the browser. Saving uses **Supabase** when configured, and falls back to **localStorage** otherwise. Everything here runs on Gemini's **free tier** — no credit card.

## How a dossier is built
1. **Research pass** — Gemini searches the web for the player's current club, latest-season stats, value, contract, form and news.
2. **Structure pass** — those fresh notes are turned into the dossier JSON the UI renders.

Because it hits the API twice, a dossier takes ~10–25 seconds. Free-tier limits for `gemini-2.5-flash` are ~10 requests/min and ~250/day (each dossier = 2 requests), so heavy back-to-back use may briefly rate-limit (HTTP 429) — just wait a moment.

---

## 1. Run locally

```bash
npm install
cp .env.example .env.local      # then paste your GEMINI_API_KEY
npm run dev                     # http://localhost:3000
```

Get a **free** key at https://aistudio.google.com/apikey (no card needed).

## 2. Deploy on Vercel

1. Push to GitHub, import the repo at https://vercel.com/new (auto-detects Next.js).
2. In **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` — required
   - `GEMINI_MODEL` — optional (defaults to `gemini-2.5-flash`)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — optional (below)
3. Deploy. (The scout route may run 20s+; Vercel's default function duration covers this. If you ever see a timeout, raise the function's max duration in project settings.)

## 3. Supabase (optional — a shelf that syncs across devices)

Without it, saves live in the browser's localStorage. To sync:
1. Create a project at https://supabase.com.
2. In the **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy the **Project URL** and **anon public** key (Project Settings → API) into the two `NEXT_PUBLIC_SUPABASE_*` env vars locally and on Vercel.
4. Redeploy — the footer flips to "Saving to Supabase".

> The default policy grants the anon key full access — fine for a personal tool. For anything shared, add Supabase Auth and scope rows to `auth.uid()`.

---

## Notes
- **Freshness:** dossiers are grounded in a live search, so they track the latest season — but still sanity-check a key stat. Every field is editable (open a dossier → **Edit**), then **Save**.
- **Cost:** Gemini free tier. Set `GEMINI_MODEL` to a newer Flash model any time Google ships one.

## Structure
```
app/api/scout/route.ts   two-pass Gemini call (research + structure), key stays server-side
app/{layout,page}.tsx, app/globals.css
components/ScoutRoom.tsx  home / detail / compare + editing
components/charts.tsx     radar, bars, gauge, score bars
lib/prompt.ts             research + structuring prompts
lib/normalize.ts          guards model output into a safe shape
lib/types.ts              Dossier type + attribute/stat keys
lib/store.ts              Supabase-or-localStorage persistence
lib/{supabase,theme}.ts
supabase/schema.sql
```
