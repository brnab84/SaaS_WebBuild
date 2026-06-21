import { useState } from "react";
import type { PageDTO } from "@webforge/shared";
import { useEditorStore } from "../../store/editor.js";
import { confirmDialog, promptDialog } from "../../store/dialog.js";

function PageRow({ p }: { p: PageDTO }) {
  const page = useEditorStore((s) => s.page);
  const openPage = useEditorStore((s) => s.openPage);
  const renamePage = useEditorStore((s) => s.renamePage);
  const removePage = useEditorStore((s) => s.removePage);
  const active = page?.id === p.id;

  async function rename(e: React.MouseEvent) {
    e.stopPropagation();
    const title = await promptDialog({
      title: "Rename page",
      initialValue: p.title,
      placeholder: "Page title",
      confirmLabel: "Rename",
    });
    if (title && title.trim()) await renamePage(p.id, title.trim());
  }
  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: `Delete page "${p.title}"?`,
      confirmLabel: "Delete page",
      danger: true,
    });
    if (ok) await removePage(p.id);
  }

  return (
    <div
      className={`group flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition ${
        active ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <button onClick={() => openPage(p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="truncate">{p.title}</span>
        {p.isHome && <span className="text-[10px] text-slate-400">HOME</span>}
      </button>
      <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={rename} title="Rename" className="px-1 text-slate-400 hover:text-slate-700">
          ✎
        </button>
        {!p.isHome && (
          <button onClick={remove} title="Delete" className="px-1 text-slate-400 hover:text-rose-600">
            🗑
          </button>
        )}
      </span>
    </div>
  );
}

export function PagesPanel() {
  const pages = useEditorStore((s) => s.pages);
  const addPage = useEditorStore((s) => s.addPage);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const title = await promptDialog({
      title: "New page",
      placeholder: "Page title",
      confirmLabel: "Add page",
    });
    if (!title) return;
    setAdding(true);
    try {
      await addPage(title);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pages</h3>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
        >
          + Add
        </button>
      </div>
      <div className="space-y-1">
        {pages.map((p) => (
          <PageRow key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
