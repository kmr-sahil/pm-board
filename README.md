# PM Board

Minimal Trello-style project management for a small agency: staff manage projects on a kanban board with subtasks and internal notes; clients get a read-only view of their project's progress.

**Stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS)

## Roles

| | admin | employee | client |
|---|---|---|---|
| Projects / stages / tasks | full | full | read-only, own projects |
| Subtasks | full | full | hidden |
| Notes (credentials, secrets) | full | full | hidden |
| Manage user roles | Supabase table editor | — | — |

All role rules are enforced server-side with Postgres Row Level Security — hiding things in the UI is cosmetic on top of that.

## Setup

1. **Create a Supabase project** at [database.new](https://database.new).
2. **Run the schema:** open Dashboard → SQL Editor, paste the contents of `supabase/schema.sql`, run it.
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
- Everyone else becomes an **employee**. To change someone's role, edit the `profiles` table in the Supabase dashboard.

## Flow

1. Staff clicks **+** next to Projects → fills the minimal onboarding form (project name, description, client name + email).
2. The project is created with default stages (Backlog / In Progress / Review / Done) — rename by deleting/adding, drag tasks between stages.
3. Client requests come in → staff create tasks, break them into subtasks, and work through them.
4. Credentials and secrets live in the project's **Notes** tab — visible to admins and employees only.
5. The client signs in with the onboarded email and sees just their board: stages, tasks, and a progress bar (tasks in the last stage / total). No subtasks, no notes, no editing.
# pm-board
