import { KanbanSquare } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
      <KanbanSquare className="size-10" />
      <p className="text-sm">Select a project from the sidebar, or create one.</p>
    </div>
  );
}
