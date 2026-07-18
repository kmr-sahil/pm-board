-- Migration 4: per-project access control, client permissions, task authorship.
-- Run in Supabase Dashboard -> SQL Editor (after migration-3.sql).
--
-- THE BUG THIS FIXES: schema.sql granted staff `for all using (is_staff())` on
-- projects/stages/tasks, and handle_new_user() makes every new signup an
-- 'employee'. So anyone who registered could read every project in the system.
-- Access is now per-project: you must have created it, or be invited into
-- project_members. Admin and employee have identical rights.

-- ---------- 0. Remove the dev role backdoor ----------
-- /login?role=admin let anyone grant themselves admin. Not safe to keep.
drop function if exists public.set_login_role(public.user_role);

-- ---------- 1. Authorship columns ----------
alter table public.tasks
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

alter table public.subtasks
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

-- Stamp the author automatically so clients can't spoof it.
create or replace function public.stamp_created_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by = auth.uid();
  return new;
end $$;

drop trigger if exists tasks_stamp_created_by on public.tasks;
create trigger tasks_stamp_created_by
  before insert on public.tasks
  for each row execute function public.stamp_created_by();

drop trigger if exists subtasks_stamp_created_by on public.subtasks;
create trigger subtasks_stamp_created_by
  before insert on public.subtasks
  for each row execute function public.stamp_created_by();

-- ---------- 2. Access helper ----------
-- Security definer: reads the tables directly, so it never recurses into RLS.
create or replace function public.has_project_access(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from projects p where p.id = pid and p.created_by = auth.uid()
  ) or exists (
    select 1 from project_members m where m.project_id = pid and m.user_id = auth.uid()
  )
$$;

-- Same check, for rows that only know their task_id.
create or replace function public.has_task_access(tid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_project_access((select project_id from tasks where id = tid))
$$;

-- ---------- 3. Replace the over-permissive policies ----------
drop policy if exists "staff all projects"        on public.projects;
drop policy if exists "client reads own projects" on public.projects;
drop policy if exists "client requests own project" on public.projects;
drop policy if exists "staff all members"         on public.project_members;
drop policy if exists "read own membership"       on public.project_members;
drop policy if exists "staff all stages"          on public.stages;
drop policy if exists "client reads stages"       on public.stages;
drop policy if exists "staff all tasks"           on public.tasks;
drop policy if exists "client reads tasks"        on public.tasks;
drop policy if exists "staff all subtasks"        on public.subtasks;
drop policy if exists "staff all notes"           on public.notes;

-- projects: visible only to creator + invited members.
create policy "read accessible projects" on public.projects
  for select using (public.has_project_access(id));
-- Anyone signed in may create a project (staff board, or client onboarding).
create policy "create own project" on public.projects
  for insert to authenticated with check (created_by = auth.uid());
-- Only staff with access may rename/delete it. Clients cannot.
create policy "staff edits own projects" on public.projects
  for update using (public.is_staff() and public.has_project_access(id))
  with check (public.is_staff() and public.has_project_access(id));
create policy "staff deletes own projects" on public.projects
  for delete using (public.is_staff() and public.has_project_access(id));

-- project_members: see your own rows, plus the roster of projects you can access.
create policy "read project roster" on public.project_members
  for select using (user_id = auth.uid() or public.has_project_access(project_id));
create policy "staff manages roster" on public.project_members
  for insert with check (public.is_staff() and public.has_project_access(project_id));
create policy "staff removes roster" on public.project_members
  for delete using (public.is_staff() and public.has_project_access(project_id));

-- stages: everyone with access reads; only staff mutate.
create policy "read accessible stages" on public.stages
  for select using (public.has_project_access(project_id));
create policy "staff writes stages" on public.stages
  for all using (public.is_staff() and public.has_project_access(project_id))
  with check (public.is_staff() and public.has_project_access(project_id));

-- tasks: everyone with access reads AND may add. Only staff edit/delete.
create policy "read accessible tasks" on public.tasks
  for select using (public.has_project_access(project_id));
create policy "members add tasks" on public.tasks
  for insert with check (public.has_project_access(project_id));
create policy "staff edits tasks" on public.tasks
  for update using (public.is_staff() and public.has_project_access(project_id))
  with check (public.is_staff() and public.has_project_access(project_id));
create policy "staff deletes tasks" on public.tasks
  for delete using (public.is_staff() and public.has_project_access(project_id));

-- subtasks + notes: staff only, and only on projects they can access.
create policy "staff all subtasks" on public.subtasks
  for all using (public.is_staff() and public.has_task_access(task_id))
  with check (public.is_staff() and public.has_task_access(task_id));

create policy "staff all notes" on public.notes
  for all using (public.is_staff() and public.has_project_access(project_id))
  with check (public.is_staff() and public.has_project_access(project_id));

-- ---------- 3b. Let teammates see each other's names ----------
-- Without this, a client can't resolve the profile of whoever created a task,
-- so "Created by" renders blank for them. Scoped to shared projects only —
-- it does not expose the whole user table.
create or replace function public.shares_project_with(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from project_members mine
    join project_members theirs on mine.project_id = theirs.project_id
    where mine.user_id = auth.uid() and theirs.user_id = uid
  )
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_staff()
    or public.shares_project_with(id)
  );

-- ---------- 4. Creator is always a member ----------
-- Guarantees has_project_access() stays true even if created_by is later cleared.
create or replace function public.handle_new_project()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into stages (project_id, name, position) values
    (new.id, 'Backlog', 0),
    (new.id, 'In Progress', 1),
    (new.id, 'Review', 2),
    (new.id, 'Done', 3);

  if new.created_by is not null then
    insert into project_members (project_id, user_id)
    values (new.id, new.created_by)
    on conflict do nothing;
  end if;

  if new.client_email is not null then
    insert into project_members (project_id, user_id)
    select new.id, p.id from profiles p where lower(p.email) = lower(new.client_email)
    on conflict do nothing;

    update profiles set role = 'client'
    where lower(email) = lower(new.client_email) and role <> 'admin';
  end if;

  return new;
end;
$$;
