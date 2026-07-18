"use client";

import { useState } from "react";
import { KanbanSquare, Plus } from "lucide-react";
import type { Profile } from "@/lib/types";
import { ProjectFormModal } from "./project-form-modal";

export function HomeCta({ profile, hasProjects }: { profile: Profile; hasProjects: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const isClient = profile.role === "client";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <KanbanSquare className="size-10 text-zinc-300 dark:text-zinc-700" />

      <div className="space-y-1">
        <h1 className="font-semibold">
          {hasProjects
            ? "Select a project"
            : isClient
              ? "Let's get your project started"
              : "No projects yet"}
        </h1>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          {hasProjects
            ? "Pick one from the sidebar to see its board and progress."
            : isClient
              ? "Tell us what you need and we'll set up a board so you can follow progress in real time."
              : "Create your first project, and optionally onboard a client so they can follow along."}
        </p>
      </div>

      <button onClick={() => setShowForm(true)} className="btn">
        <Plus className="size-4" />
        {isClient ? "Request a project" : "New project"}
      </button>

      {showForm && (
        <ProjectFormModal profile={profile} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
