"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Profile, Stage, Subtask, Task } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";

type StaffOption = Pick<Profile, "id" | "full_name" | "email">;

export function TaskDialog({
  task,
  stages,
  readOnly,
  onClose,
  onMoveStage,
  onUpdated,
  onDeleted,
}: {
  task: Task;
  stages: Stage[];
  readOnly: boolean;
  onClose: () => void;
  onMoveStage: (stageId: string) => void;
  onUpdated: (patch: Partial<Task>) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const supabase = createClient();

  // Clients can't read subtasks or other profiles (RLS), so don't fetch.
  useEffect(() => {
    if (readOnly) return;
    supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", task.id)
      .order("position")
      .then(({ data }) => setSubtasks((data ?? []) as Subtask[]));
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("role", ["admin", "employee"])
      .order("email")
      .then(({ data }) => setStaff((data ?? []) as StaffOption[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, readOnly]);

  function syncSubtaskSummary(list: Subtask[]) {
    setSubtasks(list);
    onUpdated({ subtasks: list.map((s) => ({ done: s.done })) });
  }

  async function saveField(patch: { title?: string; description?: string | null }) {
    if (readOnly) return;
    await supabase.from("tasks").update(patch).eq("id", task.id);
    onUpdated(patch);
  }

  async function assign(userId: string) {
    const assigned_to = userId || null;
    const person = staff.find((p) => p.id === assigned_to) ?? null;
    onUpdated({ assigned_to, assignee: person });
    await supabase.from("tasks").update({ assigned_to }).eq("id", task.id);
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    const t = newSubtask.trim();
    if (!t) return;
    setNewSubtask("");
    const { data } = await supabase
      .from("subtasks")
      .insert({ task_id: task.id, title: t, position: subtasks.length })
      .select()
      .single();
    if (data) syncSubtaskSummary([...subtasks, data as Subtask]);
  }

  async function toggleSubtask(s: Subtask) {
    syncSubtaskSummary(subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
    await supabase.from("subtasks").update({ done: !s.done }).eq("id", s.id);
  }

  async function deleteSubtask(s: Subtask) {
    syncSubtaskSummary(subtasks.filter((x) => x.id !== s.id));
    await supabase.from("subtasks").delete().eq("id", s.id);
  }

  async function deleteTask() {
    await supabase.from("tasks").delete().eq("id", task.id);
    onDeleted();
  }

  const done = subtasks.filter((s) => s.done).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          {readOnly ? (
            <h2 className="font-semibold">{title}</h2>
          ) : (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && saveField({ title })}
              className="w-full bg-transparent font-semibold outline-none"
            />
          )}
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="size-4" />
          </button>
        </div>

        {readOnly ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {description || "No description."}
          </p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Stage
                </span>
                <select
                  value={task.stage_id}
                  onChange={(e) => onMoveStage(e.target.value)}
                  className="input"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Assignee
                </span>
                <select
                  value={task.assigned_to ?? ""}
                  onChange={(e) => assign(e.target.value)}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {staff.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name ?? p.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() =>
                description !== (task.description ?? "") &&
                saveField({ description: description || null })
              }
              placeholder="Add a description…"
              rows={3}
              className="input resize-none"
            />

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Subtasks {subtasks.length > 0 && `· ${done}/${subtasks.length}`}
              </p>
              <ul className="space-y-1">
                {subtasks.map((s) => (
                  <li
                    key={s.id}
                    className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={() => toggleSubtask(s)}
                      className="size-4 accent-indigo-600"
                    />
                    <span className={`flex-1 text-sm ${s.done ? "text-zinc-400 line-through" : ""}`}>
                      {s.title}
                    </span>
                    <button
                      onClick={() => deleteSubtask(s)}
                      className="p-1 text-zinc-300 opacity-0 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <form onSubmit={addSubtask} className="mt-2 flex items-center gap-2">
                <Plus className="size-4 text-zinc-400" />
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add subtask…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                />
              </form>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="text-xs text-zinc-400">
                {task.created_at && <p>Created {formatDateTime(task.created_at)}</p>}
                {task.updated_at && <p>Updated {formatDateTime(task.updated_at)}</p>}
              </div>
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 className="size-4" /> Delete task
              </button>
            </div>
          </>
        )}

        {confirmDelete && (
          <ConfirmDialog
            title="Delete this task?"
            message="The task and all its subtasks will be permanently deleted."
            confirmLabel="Delete"
            onConfirm={deleteTask}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    </div>
  );
}
