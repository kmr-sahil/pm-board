-- Migration 2: assignees, timestamps, client requests, share links, login roles.
-- Run in Supabase Dashboard -> SQL Editor (after schema.sql).

-- 1. Task assignee + updated_at
alter table public.tasks
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- 2. Clients can request a project for themselves (the /request page).
-- The on_project_created trigger auto-links them as a member.
create policy "client requests own project" on public.projects
  for insert to authenticated
  with check (lower(client_email) = lower(auth.jwt() ->> 'email'));

-- 3. Share links: anonymous read-only view of a board by secret token.
alter table public.projects
  add column if not exists share_token uuid not null default gen_random_uuid();

create or replace function public.get_shared_project(token uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'project', jsonb_build_object('id', p.id, 'name', p.name, 'description', p.description),
    'stages', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.position), '[]'::jsonb)
      from stages s where s.project_id = p.id
    ),
    'tasks', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.position), '[]'::jsonb)
      from tasks t where t.project_id = p.id
    )
  )
  from projects p
  where p.share_token = token
$$;

-- 4. DEV CONVENIENCE — pick a role at login: /login?role=admin|employee|client.
-- WARNING: anyone who knows this URL pattern can grab any role, including admin.
-- Remove it before going to production:  drop function public.set_login_role;
create or replace function public.set_login_role(requested public.user_role)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update profiles set role = requested where id = auth.uid();
end $$;
