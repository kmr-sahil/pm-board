import Link from "next/link";
import type { Project, Stage, Task } from "@/lib/types";
import { ShareButton } from "./share-button";

export function ProjectHeader({
  project,
  stages = [],
  tasks = [],
  isClient,
  activeTab = "board",
}: {
  project: Project;
  stages?: Stage[];
  tasks?: Task[];
  isClient: boolean;
  activeTab?: "board" | "notes";
}) {
  // Progress = tasks sitting in the last stage (e.g. "Done") vs total.
  const lastStage = stages[stages.length - 1];
  const done = lastStage ? tasks.filter((t) => t.stage_id === lastStage.id).length : 0;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <header className="flex items-center gap-4 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
      <div className="min-w-0">
        <h1 className="truncate font-semibold">{project.name}</h1>
        {project.client_name && (
          <p className="truncate text-xs text-zinc-400">for {project.client_name}</p>
        )}
      </div>

      {activeTab === "board" && tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{pct}%</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        {!isClient && project.share_token && <ShareButton token={project.share_token} />}
        <Link
          href={`/projects/${project.id}`}
          className={activeTab === "board" ? "btn-ghost bg-zinc-200 dark:bg-zinc-800" : "btn-ghost"}
        >
          Board
        </Link>
        {!isClient && (
          <Link
            href={`/projects/${project.id}/notes`}
            className={activeTab === "notes" ? "btn-ghost bg-zinc-200 dark:bg-zinc-800" : "btn-ghost"}
          >
            Notes
          </Link>
        )}
      </div>
    </header>
  );
}
