"use client";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div className="card w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">{title}</h3>
        {message && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn bg-red-600 hover:bg-red-500">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
