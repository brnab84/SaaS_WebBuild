import { useState } from "react";
import { Link } from "react-router-dom";
import { siteApi } from "../../lib/api.js";
import { useEditorStore, type Breakpoint, type SaveStatus } from "../../store/editor.js";

const BREAKPOINTS: { id: Breakpoint; label: string; icon: string }[] = [
  { id: "desktop", label: "Desktop", icon: "🖥" },
  { id: "tablet", label: "Tablet", icon: "▭" },
  { id: "mobile", label: "Mobile", icon: "▯" },
];

const SAVE_TEXT: Record<SaveStatus, string> = {
  idle: "All changes saved",
  dirty: "Editing…",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed — retrying on next edit",
};

export function Toolbar() {
  const site = useEditorStore((s) => s.site);
  const page = useEditorStore((s) => s.page);
  const breakpoint = useEditorStore((s) => s.breakpoint);
  const setBreakpoint = useEditorStore((s) => s.setBreakpoint);
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const setSite = useEditorStore((s) => s.setSite);
  const saveNow = useEditorStore((s) => s.saveNow);

  const [busy, setBusy] = useState(false);

  if (!site) return null;
  const published = site.status === "published";

  async function publish() {
    if (!site) return;
    setBusy(true);
    try {
      await saveNow(); // flush latest edits before publishing
      const res = await siteApi.publish(site.id);
      setSite(res.site);
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (!site) return;
    setBusy(true);
    try {
      const updated = await siteApi.unpublish(site.id);
      setSite(updated);
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Sites
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{site.name}</p>
          <p className="truncate text-xs text-slate-400">
            {page?.title ?? "—"} · {SAVE_TEXT[saveStatus]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setBreakpoint(bp.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              breakpoint === bp.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
            title={bp.label}
          >
            <span className="mr-1">{bp.icon}</span>
            {bp.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setMode("edit")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              mode === "edit" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              mode === "preview" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
          >
            Preview
          </button>
        </div>

        {published && (
          <a
            href={`/s/${site.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:underline"
          >
            View live ↗
          </a>
        )}

        {published ? (
          <button
            onClick={unpublish}
            disabled={busy}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? "…" : "Unpublish"}
          </button>
        ) : (
          <button
            onClick={publish}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>
    </header>
  );
}
