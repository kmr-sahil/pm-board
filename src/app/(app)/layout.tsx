import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Project } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("projects").select("*").order("created_at"),
  ]);
  if (!profile) redirect("/login");

  return (
    <div className="flex h-screen">
      <Sidebar
        profile={profile as Profile}
        projects={(projects ?? []) as Project[]}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
