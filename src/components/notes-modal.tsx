"use client";

import { useEffect, useState } from "react";
import { StickyNote, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { Notes } from "./notes";

export function NotesButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost"
        title="Internal notes — hidden from clients"
      >
        <StickyNote className="size-4" /> Notes
      </button>
      {open && <NotesModal projectId={projectId} onClose={() => setOpen(false)} />}
    </>
  );
}

function NotesModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    createClient()
      .from("notes")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setNotes((data ?? []) as Note[]));
  }, [projectId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="font-semibold">
            Notes <span className="text-xs font-normal text-zinc-400">team only</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>
        {notes === null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            Loading…
          </div>
        ) : (
          <Notes projectId={projectId} initialNotes={notes} />
        )}
      </div>
    </div>
  );
}
