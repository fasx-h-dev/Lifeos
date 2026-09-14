# LifeOS

Your personal AI operating system — School, Study, Opportunity, and Business agents,
gated by a Context Gate that never guesses and a Permission Model that never bypasses
approval for anything risky.

## Layout

```
apps/web        Next.js (App Router) — the entire app: UI + /api/* routes. Owns all secrets.
packages/core    Context Gate, Permission Model, Approval state machine, Audit Logger.
                 Pure TypeScript, framework-free, fully unit-tested.
packages/db      Drizzle ORM schema + migrations + repository layer. Runs against a real
                 Postgres connection string in prod; an embedded pglite DB for tests/dev.
packages/ai      generate/classify/extract/summarize/analyze over OpenAI, with graceful
                 AI_PROVIDER_NOT_CONFIGURED degradation and $ cost tracking.
packages/agents  School / Study / Opportunity / Business agent logic.
legacy-vite-app/ The original Vite+React+Supabase scaffold this replaced. Kept for
                 reference rather than deleted outright.
```

## Local development

```
npm install
npm run dev        # apps/web on http://localhost:3000
npm test            # unit tests across packages/core, db, ai, agents
npm run test:e2e -w apps/web   # Playwright, against a real running instance
```

No `.env` is required to run locally — see `.env.example`. Without `DATABASE_URL` the
app uses an in-memory database (dev convenience only); without Supabase env vars it uses
a clearly-labeled dev-only login instead of real auth.

## Deploying

See `DEPLOYMENT.md`.
