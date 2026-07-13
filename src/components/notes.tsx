"use client";

import { useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";

export function Notes({
  projectId,
  initialNotes,
}: {
  projectId: string;
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [saved, setSaved] = useState(true);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const supabase = createClient();
  const active = notes.find((n) => n.id === activeId) ?? null;

  async function addNote() {
    const { data } = await supabase
      .from("notes")
      .insert({ project_id: projectId })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data as Note, ...prev]);
      setActiveId(data.id);
    }
  }

  function editActive(patch: Partial<Note>) {
    if (!active) return;
    setSaved(false);
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, ...patch } : n)));
  }

  async function saveActive() {
    if (!active || saved) return;
    await supabase
      .from("notes")
      .update({ title: active.title, content: active.content, updated_at: new Date().toISOString() })
      .eq("id", active.id);
    setSaved(true);
  }

  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
    setNoteToDelete(null);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
            <Lock className="size-3" /> Team only
          </span>
          <button
            onClick={addNote}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            title="New note"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {notes.length === 0 && (
            <p className="px-2 py-4 text-sm text-zinc-400">
              No notes yet. Keep credentials, secrets and handover docs here — clients never see
              this tab.
            </p>
          )}
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                n.id === activeId
                  ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {n.title || "Untitled"}
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <div className="flex flex-1 flex-col p-6">
          <div className="mb-3 flex items-center gap-3">
            <input
              value={active.title}
              onChange={(e) => editActive({ title: e.target.value })}
              onBlur={saveActive}
              placeholder="Untitled"
              className="flex-1 bg-transparent text-lg font-semibold outline-none"
            />
            <span className="text-xs text-zinc-400">{saved ? "Saved" : "Unsaved"}</span>
            <button
              onClick={() => setNoteToDelete(active)}
              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              title="Delete note"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <textarea
            value={active.content}
            onChange={(e) => editActive({ content: e.target.value })}
            onBlur={saveActive}
            placeholder="Credentials, secrets, meeting notes… visible to admins and employees only."
            className="flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-zinc-400"
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
          Select or create a note.
        </div>
      )}

      {noteToDelete && (
        <ConfirmDialog
          title={`Delete "${noteToDelete.title || "Untitled"}"?`}
          message="The note will be permanently deleted."
          confirmLabel="Delete"
          onConfirm={() => deleteNote(noteToDelete.id)}
          onCancel={() => setNoteToDelete(null)}
        />
      )}
    </div>
  );
}
