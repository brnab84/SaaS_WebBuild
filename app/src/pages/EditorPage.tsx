import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { BLOCK_LIBRARY, type BlockType } from "@webforge/shared";
import { useEditorStore } from "../store/editor.js";
import { findNode } from "../lib/tree.js";
import { Toolbar } from "../components/editor/Toolbar.js";
import { EditorCanvas } from "../components/editor/EditorCanvas.js";
import { BlockPalette } from "../components/panels/BlockPalette.js";
import { PagesPanel } from "../components/panels/PagesPanel.js";
import { PropertiesPanel } from "../components/panels/PropertiesPanel.js";
import { BrandKitPanel } from "../components/panels/BrandKitPanel.js";

interface DragData {
  kind: "palette" | "block" | "zone";
  blockType?: BlockType;
  id?: string;
  parentId?: string;
  index?: number;
}

export function EditorPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const loadEditor = useEditorStore((s) => s.loadEditor);
  const addBlock = useEditorStore((s) => s.addBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const loading = useEditorStore((s) => s.loading);
  const error = useEditorStore((s) => s.error);

  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"design" | "brand">("design");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (siteId) void loadEditor(siteId);
  }, [siteId, loadEditor]);

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragData | undefined;
    if (data?.kind === "palette" && data.blockType) {
      setActiveLabel(BLOCK_LIBRARY.find((b) => b.type === data.blockType)?.label ?? "Block");
    } else if (data?.kind === "block" && data.id) {
      const tree = useEditorStore.getState().tree;
      const node = tree ? findNode(tree, data.id) : null;
      setActiveLabel(node ? node.type : "Block");
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = e;
    if (!over) return;
    const a = active.data.current as DragData | undefined;
    const o = over.data.current as DragData | undefined;
    if (!a || !o) return;

    let parentId: string;
    let index: number;
    if (o.kind === "zone") {
      const tree = useEditorStore.getState().tree;
      const node = tree && o.parentId ? findNode(tree, o.parentId) : null;
      parentId = o.parentId!;
      index = node ? node.children.length : 0;
    } else if (o.kind === "block") {
      parentId = o.parentId!;
      index = o.index ?? 0;
    } else {
      return;
    }

    if (a.kind === "palette" && a.blockType) {
      addBlock(a.blockType, parentId, index);
    } else if (a.kind === "block" && a.id && a.id !== over.id) {
      moveBlock(a.id, parentId, index);
    }
  }

  if (error) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800">Couldn’t open this site</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-screen flex-col">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          {/* Left: blocks + pages */}
          <aside className="wf-scroll w-64 shrink-0 overflow-auto border-r border-slate-200 bg-white p-3">
            <div className="space-y-6">
              <BlockPalette />
              <PagesPanel />
            </div>
          </aside>

          {/* Center: canvas */}
          <main className="min-w-0 flex-1">
            {loading ? (
              <div className="grid h-full place-items-center text-slate-400">Loading…</div>
            ) : (
              <EditorCanvas />
            )}
          </main>

          {/* Right: properties / brand kit */}
          <aside className="wf-scroll w-72 shrink-0 overflow-auto border-l border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setRightTab("design")}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${
                  rightTab === "design" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                Design
              </button>
              <button
                onClick={() => setRightTab("brand")}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${
                  rightTab === "brand" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                Brand Kit
              </button>
            </div>
            {rightTab === "design" ? <PropertiesPanel /> : <BrandKitPanel />}
          </aside>
        </div>
      </div>

      <DragOverlay>
        {activeLabel ? (
          <div className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
