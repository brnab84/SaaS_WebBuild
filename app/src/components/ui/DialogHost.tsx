import { useEffect, useState } from "react";
import { useDialogStore } from "../../store/dialog.js";

/**
 * Renders the currently-pending confirm/prompt dialog. Mounted once at the app
 * root; driven entirely by the dialog store. See store/dialog.ts.
 */
export function DialogHost() {
  const pending = useDialogStore((s) => s.pending);
  const settle = useDialogStore((s) => s.settle);
  const [value, setValue] = useState("");

  // Seed the input whenever a prompt opens.
  useEffect(() => {
    if (pending?.request.kind === "prompt") setValue(pending.request.initialValue);
  }, [pending]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!pending) return;
      if (e.key === "Escape") settle(pending.request.kind === "prompt" ? null : false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, settle]);

  if (!pending) return null;
  const { request } = pending;
  const isPrompt = request.kind === "prompt";

  function cancel() {
    settle(isPrompt ? null : false);
  }
  function accept() {
    settle(isPrompt ? value : true);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40 p-4" onClick={cancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold text-slate-800">{request.title}</h2>
        {request.message && <p className="mb-3 text-sm text-slate-500">{request.message}</p>}

        {isPrompt && (
          <input
            autoFocus
            type={request.numeric ? "number" : "text"}
            inputMode={request.numeric ? "decimal" : undefined}
            value={value}
            placeholder={request.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") accept();
            }}
            className="mb-1 mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={cancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {request.cancelLabel}
          </button>
          <button
            onClick={accept}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              !isPrompt && request.danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
