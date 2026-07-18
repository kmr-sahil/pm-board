import type { Member, Project, Stage, Task } from "@/lib/types";
import { NotesButton } from "./notes-modal";
import { ShareButton } from "./share-button";
import { TeamButton } from "./team-modal";

export function ProjectHeader({
  project,
  stages = [],
  tasks = [],
  members = [],
  isClient,
}: {
  project: Project;
  stages?: Stage[];
  tasks?: Task[];
  members?: Member[];
  isClient: boolean;
}) {
  // Progress = tasks sitting in the last stage (e.g. "Done") vs total.
  const lastStage = stages[stages.length - 1];
  const done = lastStage ? tasks.filter((t) => t.stage_id === lastStage.id).length : 0;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 py-3 pl-14 pr-4 dark:border-zinc-800 md:pl-5">
      <div className="min-w-0">
        <h1 className="truncate font-semibold">{project.name}</h1>
        {project.client_name && (
          <p className="truncate text-xs text-zinc-400">for {project.client_name}</p>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 sm:w-28">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{pct}%</span>
        </div>
      )}

      {!isClient && (
        <div className="ml-auto flex items-center gap-1">
          {project.share_token && <ShareButton token={project.share_token} />}
          <TeamButton projectId={project.id} members={members} />
          <NotesButton projectId={project.id} />
        </div>
      )}
    </header>
  );
}
