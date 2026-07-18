-- Migration 3: subtask assignees.
-- Run in Supabase Dashboard -> SQL Editor (after migration-2.sql).

alter table public.subtasks
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null;
