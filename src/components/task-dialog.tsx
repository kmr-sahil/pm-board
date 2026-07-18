"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Member, Perms, Stage, Subtask, Task } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";

export function TaskDialog({
  task,
  stages,
  members,
  perms,
  onClose,
  onMoveStage,
  onUpdated,
  onDeleted,
}: {
  task: Task;
  stages: Stage[];
  members: Member[];
  perms: Perms;
  onClose: () => void;
  onMoveStage: (stageId: string) => void;
  onUpdated: (patch: Partial<Task>) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const supabase = createClient();

  const readOnly = !perms.canEdit;
  // Only project team members (excluding the client) can be assigned.
  const assignable = members.filter((m) => m.role !== "client");
  const stageName = stages.find((s) => s.id === task.stage_id)?.name;
  const createdBy = task.creator?.full_name ?? task.creator?.email;
  const assignedTo = task.assignee?.full_name ?? task.assignee?.email;

  // Clients can't read subtasks (RLS), so don't fetch.
  useEffect(() => {
    if (readOnly) return;
    supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", task.id)
      .order("position")
      .then(({ data }) => setSubtasks((data ?? []) as Subtask[]));
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
    const person = assignable.find((p) => p.id === assigned_to) ?? null;
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

  async function assignSubtask(s: Subtask, userId: string) {
    const assigned_to = userId || null;
    setSubtasks((prev) => prev.map((x) => (x.id === s.id ? { ...x, assigned_to } : x)));
    await supabase.from("subtasks").update({ assigned_to }).eq("id", s.id);
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
      <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
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
          /* ---------- Client view: status + description, nothing editable ---------- */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {stageName && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  {stageName}
                </span>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                {description || "No description yet."}
              </p>
            </div>

            {/* Assignment is deliberately omitted — clients don't see who is on it. */}
            <dl className="grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800 sm:grid-cols-2">
              {task.created_at && (
                <div>
                  <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    <CalendarDays className="size-3.5" /> Created
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">
                    {formatDateTime(task.created_at)}
                  </dd>
                </div>
              )}
              {createdBy && (
                <div>
                  <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    <UserRound className="size-3.5" /> Created by
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">{createdBy}</dd>
                </div>
              )}
              {task.updated_at && (
                <div>
                  <dt className="mb-0.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Last updated
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">
                    {formatDateTime(task.updated_at)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  {assignable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name ?? p.email}
                    </option>
                  ))}
                </select>
                {assignable.length === 0 && (
                  <span className="mt-1 block text-xs text-zinc-400">
                    Add people via the Team button first.
                  </span>
                )}
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
                    <span className={`min-w-0 flex-1 truncate text-sm ${s.done ? "text-zinc-400 line-through" : ""}`}>
                      {s.title}
                    </span>
                    <select
                      value={s.assigned_to ?? ""}
                      onChange={(e) => assignSubtask(s, e.target.value)}
                      className="max-w-24 truncate rounded bg-transparent text-xs text-zinc-400 outline-none hover:text-zinc-600 dark:hover:text-zinc-300"
                      title="Assign subtask"
                    >
                      <option value="">—</option>
                      {assignable.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name ?? p.email}
                        </option>
                      ))}
                    </select>
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

            <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="space-y-0.5 text-xs text-zinc-400">
                {task.created_at && (
                  <p>
                    Created {formatDateTime(task.created_at)}
                    {createdBy && <> by <span className="text-zinc-500 dark:text-zinc-300">{createdBy}</span></>}
                  </p>
                )}
                {task.updated_at && <p>Updated {formatDateTime(task.updated_at)}</p>}
                <p>
                  Assigned to{" "}
                  <span className="text-zinc-500 dark:text-zinc-300">
                    {assignedTo ?? "nobody yet"}
                  </span>
                </p>
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
