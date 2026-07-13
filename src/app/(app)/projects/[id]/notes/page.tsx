import { notFound, redirect } from "next/navigation";
import { Notes } from "@/components/notes";
import { ProjectHeader } from "@/components/project-header";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

export default async function NotesPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  // Notes are internal: clients are sent back to the board.
  if (!profile || profile.role === "client") redirect(`/projects/${id}`);

  const [{ data: project }, { data: notes }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("notes")
      .select("*")
      .eq("project_id", id)
      .order("updated_at", { ascending: false }),
  ]);
  if (!project) notFound();

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader project={project} isClient={false} activeTab="notes" />
      <Notes projectId={id} initialNotes={(notes ?? []) as Note[]} />
    </div>
  );
}
