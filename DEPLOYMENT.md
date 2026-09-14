# Deploying LifeOS

The app is one deployable unit: `apps/web` (Next.js, App Router) serves both the
frontend and every `/api/*` route. There is no separate backend service to deploy.

## One-time setup (you do this, ~5 minutes, no CLI/token needed)

1. Go to https://vercel.com, sign in with GitHub, click **Add New → Project**.
2. Import this repository (`fasx-h-dev/Lifeos`, branch `claude/practical-franklin-b1cpeh`
   or wherever it lands after merge).
3. When Vercel asks for **Root Directory**, set it to `apps/web`. Vercel auto-detects
   the npm workspaces monorepo and Next.js from there — no extra config file needed.
4. Add the environment variables listed below (Project Settings → Environment Variables).
5. Click **Deploy**. You'll get a `*.vercel.app` URL — bookmark that on your Chromebook.

## Environment variables to set (names only — see below for how to get each value)

| Variable | Required for | How to get it |
|---|---|---|
| `DATABASE_URL` | All data persistence | Supabase project → Settings → Database → Connection string (URI, "Transaction" pooler) |
| `NEXT_PUBLIC_SUPABASE_URL` | Real auth (magic link) | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real auth (magic link) | Supabase project → Settings → API |
| `OPENAI_API_KEY` | Any AI feature (extraction, study explanations, outreach drafts) | platform.openai.com → API keys |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Real push notifications | A keypair was generated for you in this session (see chat) — just paste both values in |
| `VAPID_SUBJECT` | Push notifications | `mailto:you@example.com` — any contact address |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google Calendar/Gmail sync | Google Cloud Console → APIs & Services → Credentials → OAuth client (Web application), redirect URI `https://<your-vercel-domain>/api/oauth/google/callback` |
| `TOKEN_ENCRYPTION_KEY` | Encrypting stored OAuth tokens at rest | Any random 32+ character string you generate once and keep secret |
| `SERPAPI_KEY` | "Find opportunities" web search | serpapi.com → API key (optional — without it, that one feature reports `WEB_RESEARCH_NOT_CONFIGURED` instead of failing) |

Until `DATABASE_URL` is set, nothing persists across restarts (the app falls back to
an in-memory database for local/dev convenience — see `apps/web/lib/serverDb.ts`).
Until `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` are set, the app uses a dev-only
stand-in login (clearly labeled in the UI) instead of real auth — it is hard-disabled
whenever Vercel's `NODE_ENV=production` is set (which Vercel does automatically), so
the deployed app will show that dev login only until Supabase is configured, and it
will simply not accept it once you're live without a real Supabase project.

## Redeploying after future changes

Push to the branch Vercel is tracking:

```
git push origin <branch>
```

Vercel redeploys automatically on every push. No manual command needed on your end.

## Database schema

Run once against your Supabase Postgres (from any machine with `DATABASE_URL` set,
or via the Supabase SQL editor using the generated SQL directly):

```
cd packages/db
DATABASE_URL=... npx drizzle-kit migrate
```

The SQL is also readable directly at `packages/db/migrations/0000_aspiring_magma.sql`
if you'd rather paste it into the Supabase SQL editor.
