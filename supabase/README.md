## Supabase env variables

Set the following environment variables in a .env file or in your hosting environment (do not commit secrets):

- VITE_SUPABASE_URL="https://xyzcompany.supabase.co"
- VITE_SUPABASE_ANON_KEY="public-anon-key"

Applying migrations
- Use the SQL files in supabase/migrations/ to create tables and RLS policies in your Supabase project.
- You can run the SQL in the Supabase SQL editor or use the supabase CLI to run migrations.

Running locally
- npm install
- npm run dev

Notes
- This app expects the Supabase migrations to be applied before dashboards are visible through the UI.
