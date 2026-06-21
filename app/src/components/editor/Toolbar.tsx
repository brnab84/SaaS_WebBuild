import { useState } from "react";
import { Link } from "react-router-dom";
import { exportSite, siteApi } from "../../lib/api.js";
import { useEditorStore, type Breakpoint, type SaveStatus } from "../../store/editor.js";
import { confirmDialog, promptDialog } from "../../store/dialog.js";

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

  async function exportCode() {
    if (!site) return;
    setBusy(true);
    try {
      const blob = await exportSite(site.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${site.slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function setDomain() {
    if (!site) return;
    const next = await promptDialog({
      title: "Custom domain",
      message: "e.g. shop.example.com — leave blank to remove.",
      placeholder: "shop.example.com",
      initialValue: site.customDomain ?? "",
      confirmLabel: "Save domain",
    });
    if (next == null) return;
    try {
      const updated = await siteApi.update(site.id, {
        customDomain: next.trim() ? next.trim().toLowerCase() : null,
      });
      setSite(updated);
    } catch {
      await confirmDialog({
        title: "Couldn’t update the domain",
        message: "It may already be in use or invalid.",
        confirmLabel: "OK",
        cancelLabel: "Close",
      });
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

        <button
          onClick={setDomain}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          title={site.customDomain ? `Custom domain: ${site.customDomain}` : "Set a custom domain"}
        >
          {site.customDomain ? `🌐 ${site.customDomain}` : "🌐 Domain"}
        </button>

        <button
          onClick={exportCode}
          disabled={busy}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          title="Download static HTML/CSS (no lock-in)"
        >
          ⬇ Export
        </button>

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
