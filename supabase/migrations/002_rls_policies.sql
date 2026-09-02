-- 002_rls_policies.sql

-- Enable pgcrypto extension if not present (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: users can select/insert/update/delete their own profile
CREATE POLICY "profiles_is_owner" ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: users can manage their own dashboards
CREATE POLICY "dashboards_is_owner" ON public.dashboards
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can manage widgets on their own dashboards
CREATE POLICY "widgets_dashboard_owner" ON public.widgets
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.dashboards d WHERE d.id = dashboard_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d WHERE d.id = dashboard_id AND d.user_id = auth.uid()));

-- Policy: users can write audit logs for their own actions
CREATE POLICY "audit_logs_is_owner" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- For read access, allow users to read their own audit logs
CREATE POLICY "audit_logs_read_own" ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);
