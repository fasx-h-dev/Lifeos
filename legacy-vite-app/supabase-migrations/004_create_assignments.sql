-- 004_create_assignments.sql
-- Create assignments table and RLS policies for per-user access

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  instructions text,
  due_date timestamptz,
  priority int NOT NULL DEFAULT 3, -- 1 = highest
  status text NOT NULL DEFAULT 'todo', -- todo | in_progress | done
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignments_user_id_idx ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS assignments_due_date_idx ON public.assignments(due_date);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_is_owner" ON public.assignments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
