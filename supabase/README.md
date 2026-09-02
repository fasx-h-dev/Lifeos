# Supabase migrations and setup instructions

This directory will contain SQL migration files for initializing the Supabase/Postgres schema and Row Level Security (RLS) policies.

- To apply these migrations, run them using the Supabase SQL editor or the `supabase` CLI in your own project.
- Do NOT commit any service_role keys or other secrets in this repository.

Migrations:
- 001_create_tables.sql - creates users, dashboards, widgets, and audit_logs tables
- 002_rls_policies.sql - enables RLS and creates per-user policies
