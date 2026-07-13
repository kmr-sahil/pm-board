"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function RequestForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isClient = profile.role === "client";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    // Generate the id client-side: a fresh client request isn't selectable
    // via RLS until the membership trigger runs, so we can't rely on
    // insert(...).select() to get it back.
    const id = crypto.randomUUID();
    const { error } = await createClient().from("projects").insert({
      id,
      name: form.get("name") as string,
      description: (form.get("description") as string) || null,
      client_name: isClient ? (profile.full_name ?? profile.email) : null,
      client_email: isClient ? profile.email : null,
      created_by: profile.id,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/projects/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-6">
      <h1 className="font-semibold">{isClient ? "Request a project" : "New project"}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {isClient
          ? "Tell us what you need — the team will pick it up and you can follow progress on the board."
          : "Create a project without client details."}
      </p>
      <div className="mt-4 space-y-3">
        <input name="name" required placeholder="Project name" className="input" />
        <textarea
          name="description"
          placeholder="What should we build or deliver?"
          rows={4}
          className="input resize-none"
        />
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={saving} className="btn mt-5 w-full justify-center py-2">
        {saving ? "Submitting…" : isClient ? "Submit request" : "Create project"}
      </button>
    </form>
  );
}
