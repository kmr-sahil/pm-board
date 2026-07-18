import { notFound, redirect } from "next/navigation";
import { Board } from "@/components/board";
import { ProjectHeader } from "@/components/project-header";
import { createClient } from "@/lib/supabase/server";
import { permsFor, type Member, type Role, type Stage, type Task } from "@/lib/types";

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
      .select(
        "*, subtasks(done), assignee:assigned_to(id, full_name, email), creator:created_by(id, full_name, email)"
      )
      .eq("project_id", id)
      .order("position"),
    supabase
      .from("project_members")
      .select("user:profiles(id, full_name, email, role)")
      .eq("project_id", id),
  ]);

  // RLS already hides projects the user has no access to, so a missing row here
  // means "not yours" as much as "doesn't exist" — both are a 404.
  if (!project) notFound();

  const perms = permsFor((profile?.role ?? "client") as Role);
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
        perms={perms}
      />
      <Board
        key={id}
        projectId={id}
        initialStages={(stages ?? []) as Stage[]}
        initialTasks={(tasks ?? []) as Task[]}
        members={members}
        perms={perms}
      />
    </div>
  );
}
