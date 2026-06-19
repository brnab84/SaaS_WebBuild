import { useState } from "react";
import { useEditorStore } from "../../store/editor.js";

export function PagesPanel() {
  const pages = useEditorStore((s) => s.pages);
  const page = useEditorStore((s) => s.page);
  const openPage = useEditorStore((s) => s.openPage);
  const addPage = useEditorStore((s) => s.addPage);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const title = window.prompt("New page title");
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
      <ul className="space-y-1">
        {pages.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => openPage(p.id)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                page?.id === p.id
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{p.title}</span>
              {p.isHome && <span className="text-[10px] text-slate-400">HOME</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
