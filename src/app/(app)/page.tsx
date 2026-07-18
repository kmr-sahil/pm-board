import { redirect } from "next/navigation";
import { HomeCta } from "@/components/home-cta";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("projects").select("id", { count: "exact", head: true }),
  ]);
  if (!profile) redirect("/login");

  return <HomeCta profile={profile as Profile} hasProjects={(count ?? 0) > 0} />;
}
