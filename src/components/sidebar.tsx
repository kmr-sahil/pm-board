"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, KanbanSquare, LogOut, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import type { Profile, Project } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { ProjectFormModal } from "./project-form-modal";
import { ThemeToggle } from "./theme-toggle";

const iconBtn =
  "rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800";

export function Sidebar({
  profile,
  projects,
}: {
  profile: Profile;
  projects: Project[];
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const [showForm, setShowForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const isStaff = profile.role !== "client";

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-zinc-200 bg-white transition-all dark:border-zinc-800 dark:bg-zinc-900 ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      {collapsed ? (
        <>
          <div className="flex flex-col items-center gap-1 py-4">
            <KanbanSquare className="size-5 text-indigo-500" />
            <button onClick={toggleCollapsed} className={iconBtn} title="Expand sidebar">
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className={iconBtn}
              title={isStaff ? "New project" : "Request a project"}
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                title={p.name}
                className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold transition-colors ${
                  params.id === p.id
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {initials(p.name)}
              </Link>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1 border-t border-zinc-200 py-3 dark:border-zinc-800">
            <ThemeToggle />
            <button onClick={() => setConfirmSignOut(true)} className={iconBtn} title="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 py-4">
            <KanbanSquare className="size-5 text-indigo-500" />
            <span className="flex-1 font-semibold">PM Board</span>
            <button onClick={toggleCollapsed} className={iconBtn} title="Collapse sidebar">
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="mb-1 flex items-center justify-between px-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Projects
              </span>
              <button
                onClick={() => setShowForm(true)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title={isStaff ? "New project / onboard client" : "Request a project"}
              >
                <Plus className="size-4" />
              </button>
            </div>

            {projects.length === 0 && (
              <p className="px-2 py-4 text-sm text-zinc-400">
                {isStaff
                  ? "No projects yet. Create one to get started."
                  : "No projects yet. Request one to get started."}
              </p>
            )}
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className={`block truncate rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  params.id === p.id
                    ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {profile.full_name ?? profile.email}
              </p>
              <p className="text-xs capitalize text-zinc-400">{profile.role}</p>
            </div>
            <ThemeToggle />
            <button onClick={() => setConfirmSignOut(true)} className={iconBtn} title="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </>
      )}

      {confirmSignOut && (
        <ConfirmDialog
          title="Sign out?"
          message="You will need to sign in again to access your boards."
          confirmLabel="Sign out"
          onConfirm={signOut}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}

      {showForm && (
        <ProjectFormModal profile={profile} onClose={() => setShowForm(false)} />
      )}
    </aside>
  );
}
