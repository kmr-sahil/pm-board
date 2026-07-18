# PM Board

Minimal Trello-style project management for a small agency: staff manage projects on a kanban board with subtasks and internal notes; clients get a read-only view of their project's progress.

**Stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS)

## Access model

**You only see a project if you created it, or someone added you to it** via the Team button. There is no "staff sees everything" rule — admin and employee have identical rights.

| | admin / employee | client |
|---|---|---|
| See a project | if creator or invited | if creator or invited |
| Stages | full | read-only |
| Tasks | full | read + **add**, no edit/delete |
| Task assignees | full | hidden |
| Subtasks | full | hidden |
| Notes (credentials, secrets) | full | hidden |

All of this is enforced server-side with Postgres Row Level Security — hiding things in the UI is cosmetic on top of that.

## Setup

1. **Create a Supabase project** at [database.new](https://database.new).
2. **Run the schema:** open Dashboard → SQL Editor and run, **in order**:
   `supabase/schema.sql` → `migration-2.sql` → `migration-3.sql` → `migration-4.sql`.
   Migration 4 is the access-control fix and is required — without it every signed-up
   user can read every project.
3. **Configure auth:**
   - Google SSO: Dashboard → Authentication → Providers → Google (add your OAuth client ID/secret).
   - Magic links work out of the box (email provider is on by default).
   - Add `http://localhost:3000/auth/callback` to Authentication → URL Configuration → Redirect URLs.
4. **Env vars:** copy your project URL and anon key (Dashboard → Settings → API) into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. **Run it:**
   ```
   npm install
   npm run dev
   ```

## How roles are assigned

- The **first user to ever sign up becomes admin** — sign up yourself first.
- Anyone whose email matches a project's client email becomes a **client** and is auto-linked to their project(s), whether they sign up before or after the project is created.
- Everyone else becomes an **employee**. A brand-new employee sees *no* projects until someone invites them.

To change a role, edit the `profiles` table in the Supabase dashboard:

```sql
update profiles set role = 'client' where email = 'someone@example.com';
```

> The old `/login?role=admin` shortcut has been removed — it let anyone grant
> themselves admin.

## Flow

1. Staff clicks **+** next to Projects (or the button on the home screen) → onboarding modal: project name, description, client name + email.
2. The project is created with default stages (Backlog / In Progress / Review / Done); drag tasks between stages.
3. **Team** button → add or remove people. Only people on the team can open the project or be assigned work.
4. Staff create tasks, break them into subtasks, and assign both to specific teammates.
5. Credentials and secrets live in the project's **Notes** modal — staff only.
6. A client signs in and sees their board: progress, stages, tasks, and each task's created date and author. They can **add** a task but not edit or delete one, and they never see who a task is assigned to.

Clients without a project yet get a **Request a project** modal — the same form, filed under their own email.
