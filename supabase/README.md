## Supabase's role in this app

Supabase now provides two things only:

1. **Auth** (magic-link sign-in) — see `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   in the root `.env.example`.
2. **Postgres hosting** — the same project's Postgres connection string is used as
   `DATABASE_URL`, accessed only from the server (`apps/web`) via Drizzle ORM.

The database schema itself is no longer defined by hand-written SQL in this folder —
it lives in `packages/db/src/schema.ts` (Drizzle) and is applied via
`packages/db/migrations/`, generated with `npm run db:generate -w packages/db`.

The original hand-written table/RLS SQL that used to live in `supabase/migrations/`
has been superseded and moved to `legacy-vite-app/supabase-migrations/` for reference.

Row-level security is not used for the new schema: since all data access now goes
through `apps/web`'s own server-side API routes (never directly from the browser to
Supabase), authorization is enforced in that application code instead.
