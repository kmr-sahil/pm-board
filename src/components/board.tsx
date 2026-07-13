"use client";

import { useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { CheckSquare, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import type { Stage, Task } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { TaskDialog } from "./task-dialog";

export const TASK_SELECT = "*, subtasks(done), assignee:assigned_to(id, full_name, email)";

export function Board({
  projectId,
  initialStages,
  initialTasks,
  readOnly,
}: {
  projectId: string;
  initialStages: Stage[];
  initialTasks: Task[];
  readOnly: boolean;
}) {
  const [stages, setStages] = useState(initialStages);
  const [tasks, setTasks] = useState(initialTasks);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const supabase = createClient();

  const tasksIn = (stageId: string) =>
    tasks.filter((t) => t.stage_id === stageId).sort((a, b) => a.position - b.position);

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    const moved = tasks.find((t) => t.id === draggableId);
    if (!moved) return;

    const sourceList = tasksIn(source.droppableId).filter((t) => t.id !== draggableId);
    const destList =
      source.droppableId === destination.droppableId
        ? sourceList
        : tasksIn(destination.droppableId);
    destList.splice(destination.index, 0, moved);

    // Diff each affected column's new order against current state and persist
    // only the rows whose stage or position actually changed.
    const changed = new Map<string, { stage_id: string; position: number }>();
    const reindex = (list: Task[], stageId: string) =>
      list.forEach((t, i) => {
        if (t.stage_id !== stageId || t.position !== i)
          changed.set(t.id, { stage_id: stageId, position: i });
      });
    reindex(destList, destination.droppableId);
    if (source.droppableId !== destination.droppableId)
      reindex(sourceList, source.droppableId);

    setTasks((prev) =>
      prev.map((t) => (changed.has(t.id) ? { ...t, ...changed.get(t.id)! } : t))
    );
    await Promise.all(
      [...changed].map(([id, patch]) => supabase.from("tasks").update(patch).eq("id", id))
    );
  }

  async function moveToStage(task: Task, stageId: string) {
    if (stageId === task.stage_id) return;
    const patch = { stage_id: stageId, position: tasksIn(stageId).length };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    setOpenTask((prev) => (prev && prev.id === task.id ? { ...prev, ...patch } : prev));
    await supabase.from("tasks").update(patch).eq("id", task.id);
  }

  async function addTask(stageId: string, title: string) {
    const position = tasksIn(stageId).length;
    const { data } = await supabase
      .from("tasks")
      .insert({ project_id: projectId, stage_id: stageId, title, position })
      .select(TASK_SELECT)
      .single();
    if (data) setTasks((prev) => [...prev, data as Task]);
  }

  async function addStage(name: string) {
    const { data } = await supabase
      .from("stages")
      .insert({ project_id: projectId, name, position: stages.length })
      .select()
      .single();
    if (data) setStages((prev) => [...prev, data as Stage]);
    setAddingStage(false);
  }

  async function deleteStage(stage: Stage) {
    await supabase.from("stages").delete().eq("id", stage.id);
    setStages((prev) => prev.filter((s) => s.id !== stage.id));
    setTasks((prev) => prev.filter((t) => t.stage_id !== stage.id));
    setStageToDelete(null);
  }

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto p-5">
      <DragDropContext onDragEnd={onDragEnd}>
        {stages.map((stage) => (
          <div key={stage.id} className="flex w-72 shrink-0 flex-col">
            <div className="group mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-medium">
                {stage.name}
                <span className="ml-2 text-xs text-zinc-400">{tasksIn(stage.id).length}</span>
              </h2>
              {!readOnly && (
                <button
                  onClick={() => setStageToDelete(stage)}
                  className="rounded p-1 text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600"
                  title="Delete stage"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>

            <Droppable droppableId={stage.id} isDropDisabled={readOnly}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-2 overflow-y-auto rounded-xl p-1 transition-colors ${
                    snapshot.isDraggingOver ? "bg-indigo-50 dark:bg-indigo-500/5" : ""
                  }`}
                >
                  {tasksIn(stage.id).map((task, index) => {
                    const subs = task.subtasks ?? [];
                    const doneCount = subs.filter((s) => s.done).length;
                    const who = task.assignee?.full_name ?? task.assignee?.email;
                    return (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setOpenTask(task)}
                            className={`card cursor-pointer p-3 text-sm shadow-sm transition-shadow hover:shadow ${
                              snapshot.isDragging ? "shadow-lg ring-2 ring-indigo-400" : ""
                            }`}
                          >
                            <p>{task.title}</p>
                            {(task.description || subs.length > 0 || who) && (
                              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                                {task.description && <span>≡</span>}
                                {subs.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <CheckSquare className="size-3" />
                                    {doneCount}/{subs.length}
                                  </span>
                                )}
                                {who && (
                                  <span
                                    title={who}
                                    className="ml-auto grid size-5 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                  >
                                    {initials(who)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {!readOnly && (
                    <AddInput placeholder="Add a task…" onAdd={(v) => addTask(stage.id, v)} />
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>

      {!readOnly && (
        <div className="w-72 shrink-0">
          {addingStage ? (
            <div className="flex items-center gap-1">
              <AddInput autoFocus placeholder="Stage name…" onAdd={addStage} />
              <button onClick={() => setAddingStage(false)} className="p-1 text-zinc-400">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingStage(true)} className="btn-ghost w-full justify-start">
              <Plus className="size-4" /> Add stage
            </button>
          )}
        </div>
      )}

      {openTask && (
        <TaskDialog
          task={openTask}
          stages={stages}
          readOnly={readOnly}
          onClose={() => setOpenTask(null)}
          onMoveStage={(stageId) => moveToStage(openTask, stageId)}
          onUpdated={(patch) => {
            setTasks((prev) => prev.map((t) => (t.id === openTask.id ? { ...t, ...patch } : t)));
            setOpenTask((prev) => (prev ? { ...prev, ...patch } : prev));
          }}
          onDeleted={() => {
            setTasks((prev) => prev.filter((t) => t.id !== openTask.id));
            setOpenTask(null);
          }}
        />
      )}

      {stageToDelete && (
        <ConfirmDialog
          title={`Delete "${stageToDelete.name}"?`}
          message={
            tasksIn(stageToDelete.id).length > 0
              ? `This stage and its ${tasksIn(stageToDelete.id).length} task(s) will be permanently deleted.`
              : "This stage will be permanently deleted."
          }
          confirmLabel="Delete"
          onConfirm={() => deleteStage(stageToDelete)}
          onCancel={() => setStageToDelete(null)}
        />
      )}
    </div>
  );
}

function AddInput({
  placeholder,
  onAdd,
  autoFocus,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v) return;
        onAdd(v);
        setValue("");
      }}
    >
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="input border-dashed bg-transparent dark:bg-transparent"
      />
    </form>
  );
}
