-- 003_seed_sample_data.sql

-- Simple seed for LifeOS: create a sample profile, dashboard, and widget for testing.
-- Run this after you have at least one auth user (sign up via magic link or create a user in Supabase auth).

-- Ensure pgcrypto is available for gen_random_uuid if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert a profiles row for the first auth user (if not exists)
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT id, email, NULL
FROM auth.users
WHERE id IN (SELECT id FROM auth.users LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- Insert a sample dashboard for that profile
INSERT INTO public.dashboards (id, user_id, title, layout)
SELECT gen_random_uuid(), p.id, 'LifeOS Sample Dashboard', jsonb_build_array(
  jsonb_build_object('id', 'widget-1', 'type', 'note', 'config', jsonb_build_object('text', 'Welcome to LifeOS!'))
)
FROM public.profiles p
WHERE p.id IN (SELECT id FROM public.profiles LIMIT 1)
ON CONFLICT DO NOTHING;

-- Insert a sample widget for the sample dashboard (if the dashboard exists)
INSERT INTO public.widgets (id, dashboard_id, type, config, position)
SELECT gen_random_uuid(), d.id, 'note', jsonb_build_object('text', 'This is a sample widget.'), jsonb_build_object('x', 0, 'y', 0)
FROM public.dashboards d
WHERE d.title = 'LifeOS Sample Dashboard'
ON CONFLICT DO NOTHING;
