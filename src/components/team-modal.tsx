"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import type { Member } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";

export function TeamButton({
  projectId,
  members,
}: {
  projectId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState<Member[]>(members);
  const [everyone, setEveryone] = useState<Member[]>([]);
  const [selected, setSelected] = useState("");
  const [toRemove, setToRemove] = useState<Member | null>(null);

  async function openModal() {
    setTeam(members);
    setOpen(true);
    const { data } = await createClient()
      .from("profiles")
      .select("id, full_name, email, role")
      .order("email");
    setEveryone((data ?? []) as Member[]);
  }

  const addable = everyone.filter((p) => !team.some((m) => m.id === p.id));

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    const person = addable.find((p) => p.id === selected);
    if (!person) return;
    setSelected("");
    const { error } = await createClient()
      .from("project_members")
      .insert({ project_id: projectId, user_id: person.id });
    if (!error) {
      setTeam((t) => [...t, person]);
      router.refresh();
    }
  }

  async function removeMember(m: Member) {
    await createClient()
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", m.id);
    setTeam((t) => t.filter((x) => x.id !== m.id));
    setToRemove(null);
    router.refresh();
  }

  return (
    <>
      <button onClick={openModal} className="btn-ghost" title="Project team">
        <Users className="size-4" /> Team
        {members.length > 0 && (
          <span className="text-xs text-zinc-400">{members.length}</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Project team</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {team.length === 0 && (
              <p className="py-2 text-sm text-zinc-400">
                No one on this project yet. Add teammates below — they become
                available as task assignees.
              </p>
            )}
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {team.map((m) => (
                <li key={m.id} className="group flex items-center gap-2 rounded-lg px-1 py-1">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {initials(m.full_name ?? m.email)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {m.full_name ?? m.email}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] capitalize text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {m.role}
                  </span>
                  <button
                    onClick={() => setToRemove(m)}
                    className="p-1 text-zinc-300 opacity-0 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600"
                    title="Remove from project"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={addMember} className="mt-4 flex gap-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="input flex-1"
              >
                <option value="">Add a person…</option>
                {addable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.full_name ?? p.email) + ` (${p.role})`}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={!selected} className="btn">
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {toRemove && (
        <ConfirmDialog
          title={`Remove ${toRemove.full_name ?? toRemove.email}?`}
          message={
            toRemove.role === "client"
              ? "This client will lose access to the project board."
              : "They will no longer appear in this project's team."
          }
          confirmLabel="Remove"
          onConfirm={() => removeMember(toRemove)}
          onCancel={() => setToRemove(null)}
        />
      )}
    </>
  );
}
