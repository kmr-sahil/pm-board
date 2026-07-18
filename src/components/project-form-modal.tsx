"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/**
 * One modal for both flows:
 *  - staff  → "New project", with optional client onboarding fields
 *  - client → "Request a project", which files a real project owned by them
 */
export function ProjectFormModal({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isClient = profile.role === "client";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    // Generate the id up front: a client's brand-new project isn't selectable
    // via RLS until the membership trigger has run, so insert().select() can
    // come back empty for them.
    const id = crypto.randomUUID();
    const { error } = await createClient()
      .from("projects")
      .insert({
        id,
        name: form.get("name") as string,
        description: (form.get("description") as string) || null,
        client_name: isClient
          ? profile.full_name ?? profile.email
          : (form.get("client_name") as string) || null,
        client_email: isClient ? profile.email : (form.get("client_email") as string) || null,
        created_by: profile.id,
      });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
    router.push(`/projects/${id}`);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card my-auto w-full max-w-md p-5 sm:p-6"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="font-semibold">
            {isClient ? "Request a project" : "New project"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {isClient
            ? "Tell us what you need. We'll pick it up and you can follow progress on the board."
            : "Add a client email to onboard them — they get read-only access to the board."}
        </p>

        <div className="space-y-3">
          <input
            name="name"
            required
            autoFocus
            placeholder={isClient ? "What do you need? (project name)" : "Project name"}
            className="input"
          />
          <textarea
            name="description"
            placeholder={
              isClient ? "Describe what you'd like us to build or deliver…" : "Short description (optional)"
            }
            rows={isClient ? 4 : 2}
            className="input resize-none"
          />

          {!isClient && (
            <>
              <p className="pt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Client onboarding (optional)
              </p>
              <input name="client_name" placeholder="Client name" className="input" />
              <input
                name="client_email"
                type="email"
                placeholder="Client email — they see the board read-only"
                className="input"
              />
            </>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={saving} className="btn mt-5 w-full justify-center py-2">
          {saving ? "Submitting…" : isClient ? "Submit request" : "Create project"}
        </button>
      </form>
    </div>
  );
}
