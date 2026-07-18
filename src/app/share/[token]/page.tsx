import { notFound } from "next/navigation";
import { KanbanSquare } from "lucide-react";
import { Board } from "@/components/board";
import { createClient } from "@/lib/supabase/server";
import type { Project, Stage, Task } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_project", { token });
  const shared = data as {
    project: Project;
    stages: Stage[];
    tasks: Task[];
  } | null;
  if (error || !shared?.project) notFound();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <KanbanSquare className="size-5 text-indigo-500" />
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{shared.project.name}</h1>
          <p className="text-xs text-zinc-400">Shared read-only view</p>
        </div>
      </header>
      <Board
        projectId={shared.project.id}
        initialStages={shared.stages}
        initialTasks={shared.tasks}
        // Anonymous link: view only, and never expose internal assignments.
        perms={{ canEdit: false, canAddTasks: false, canSeeAssignees: false }}
      />
    </div>
  );
}
