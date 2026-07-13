import { redirect } from "next/navigation";
import { RequestForm } from "@/components/request-form";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function RequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4">
      <RequestForm profile={profile as Profile} />
    </div>
  );
}
