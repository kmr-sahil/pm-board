-- pm-board schema: run this once in Supabase Dashboard -> SQL Editor.

-- ---------- Tables ----------
create type public.user_role as enum ('admin', 'employee', 'client');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'employee',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  client_name text,
  client_email text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Links client users to the projects they may view. Staff see everything, so
-- membership rows only matter for the 'client' role.
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position int not null default 0
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id uuid not null references public.stages (id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position int not null default 0
);

-- Internal notes (credentials, secrets, handover docs). Staff only.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- ---------- Helpers (security definer avoids RLS recursion) ----------
create or replace function public.get_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.get_role() in ('admin', 'employee'), false) $$;

create or replace function public.is_member(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  )
$$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.stages enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.notes enable row level security;

-- profiles: everyone reads their own row, staff read all, admins manage roles
create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "update own name" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = public.get_role());
create policy "admin manages profiles" on public.profiles
  for update using (public.get_role() = 'admin');

-- projects: staff full access, clients read their own projects
create policy "staff all projects" on public.projects
  for all using (public.is_staff()) with check (public.is_staff());
create policy "client reads own projects" on public.projects
  for select using (public.is_member(id));

-- project_members: staff manage, users see their own memberships
create policy "staff all members" on public.project_members
  for all using (public.is_staff()) with check (public.is_staff());
create policy "read own membership" on public.project_members
  for select using (user_id = auth.uid());

-- stages + tasks: staff full access, clients read-only on their projects
create policy "staff all stages" on public.stages
  for all using (public.is_staff()) with check (public.is_staff());
create policy "client reads stages" on public.stages
  for select using (public.is_member(project_id));

create policy "staff all tasks" on public.tasks
  for all using (public.is_staff()) with check (public.is_staff());
create policy "client reads tasks" on public.tasks
  for select using (public.is_member(project_id));

-- subtasks + notes: staff only, invisible to clients
create policy "staff all subtasks" on public.subtasks
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff all notes" on public.notes
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Triggers ----------
-- On signup: first user ever becomes admin; an email that matches an onboarded
-- client becomes 'client' and is linked to their projects; everyone else is staff.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if not exists (select 1 from profiles where role = 'admin') then
    v_role := 'admin';
  elsif exists (select 1 from projects where lower(client_email) = lower(new.email)) then
    v_role := 'client';
  else
    v_role := 'employee';
  end if;

  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    v_role
  );

  insert into project_members (project_id, user_id)
  select id, new.id from projects where lower(client_email) = lower(new.email)
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- On project creation: seed default stages and link the client if they
-- already have an account.
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

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();
