import { useDraggable } from "@dnd-kit/core";
import { BLOCK_LIBRARY, type BlockMeta } from "@webforge/shared";
import { useEditorStore } from "../../store/editor.js";

function PaletteItem({ meta }: { meta: BlockMeta }) {
  const addBlock = useEditorStore((s) => s.addBlock);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${meta.type}`,
    data: { kind: "palette", blockType: meta.type },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // Click also adds (keyboard/quick add); drag inserts at a position.
      onClick={() => addBlock(meta.type)}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-indigo-400 hover:shadow-sm"
      style={{ opacity: isDragging ? 0.5 : 1, cursor: "grab" }}
      title={`Add ${meta.label} — drag onto the canvas`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-lg text-slate-600">
        {meta.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{meta.label}</span>
        <span className="block truncate text-xs text-slate-500">{meta.description}</span>
      </span>
    </button>
  );
}

export function BlockPalette() {
  return (
    <div className="space-y-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Blocks
      </h3>
      {BLOCK_LIBRARY.map((meta) => (
        <PaletteItem key={meta.type} meta={meta} />
      ))}
      <p className="px-1 pt-1 text-[11px] leading-snug text-slate-400">
        Click to append, or drag onto the canvas to place precisely.
      </p>
    </div>
  );
}
