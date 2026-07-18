import { CheckCircle2, ListTodo } from "lucide-react";
import { initials } from "@/lib/utils";
import type { Member, Perms, Project, Stage, Task } from "@/lib/types";
import { NotesButton } from "./notes-modal";
import { ShareButton } from "./share-button";
import { TeamButton } from "./team-modal";

export function ProjectHeader({
  project,
  stages = [],
  tasks = [],
  members = [],
  perms,
}: {
  project: Project;
  stages?: Stage[];
  tasks?: Task[];
  members?: Member[];
  perms: Perms;
}) {
  // Progress = tasks sitting in the last stage (e.g. "Done") vs total.
  const lastStage = stages[stages.length - 1];
  const done = lastStage ? tasks.filter((t) => t.stage_id === lastStage.id).length : 0;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <header className="border-b border-zinc-200 py-3 pl-14 pr-4 dark:border-zinc-800 md:pl-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{project.name}</h1>
          {project.client_name && (
            <p className="truncate text-xs text-zinc-400">for {project.client_name}</p>
          )}
        </div>

        {perms.canEdit && (
          <div className="flex items-center gap-1">
            {project.share_token && <ShareButton token={project.share_token} />}
            <TeamButton projectId={project.id} members={members} />
            <NotesButton projectId={project.id} />
          </div>
        )}
      </div>

      {/* Clients get a plain-language status strip instead of a bare bar. */}
      {tasks.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex min-w-40 flex-1 items-center gap-2 sm:max-w-xs">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
              {pct}%
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              {done} complete
            </span>
            <span className="flex items-center gap-1.5">
              <ListTodo className="size-3.5 text-zinc-400" />
              {tasks.length - done} in progress
            </span>
          </div>

          {/* The team is public-facing info; only the per-task assignment is hidden. */}
          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-zinc-400 sm:inline">Team</span>
              <div className="flex -space-x-1.5">
                {members.slice(0, 4).map((m) => (
                  <span
                    key={m.id}
                    title={m.full_name ?? m.email}
                    className="grid size-6 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 ring-2 ring-white dark:bg-indigo-500/20 dark:text-indigo-300 dark:ring-zinc-950"
                  >
                    {initials(m.full_name ?? m.email)}
                  </span>
                ))}
                {members.length > 4 && (
                  <span className="grid size-6 place-items-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500 ring-2 ring-white dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-950">
                    +{members.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
