import { notFound, redirect } from "next/navigation";
import { Board } from "@/components/board";
import { ProjectHeader } from "@/components/project-header";
import { createClient } from "@/lib/supabase/server";
import type { Member, Stage, Task } from "@/lib/types";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: project },
    { data: profile },
    { data: stages },
    { data: tasks },
    { data: memberRows },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("stages").select("*").eq("project_id", id).order("position"),
    supabase
      .from("tasks")
      .select("*, subtasks(done), assignee:assigned_to(id, full_name, email)")
      .eq("project_id", id)
      .order("position"),
    supabase
      .from("project_members")
      .select("user:profiles(id, full_name, email, role)")
      .eq("project_id", id),
  ]);

  if (!project) notFound();
  const isClient = profile?.role === "client";
  const members = ((memberRows ?? []) as unknown as { user: Member | null }[])
    .map((r) => r.user)
    .filter((u): u is Member => u !== null);

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        project={project}
        stages={(stages ?? []) as Stage[]}
        tasks={(tasks ?? []) as Task[]}
        members={members}
        isClient={isClient}
      />
      <Board
        key={id}
        projectId={id}
        initialStages={(stages ?? []) as Stage[]}
        initialTasks={(tasks ?? []) as Task[]}
        members={members}
        readOnly={isClient}
      />
    </div>
  );
}
