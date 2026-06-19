import { create } from "zustand";
import {
  isContainer,
  makeBlock,
  type Block,
  type BlockType,
  type BrandKit,
  type PageDTO,
  type SiteDTO,
} from "@webforge/shared";
import { brandKitApi, pageApi, siteApi } from "../lib/api.js";
import { findNode, findParent, insertChild, moveNode, removeNode, updateProps } from "../lib/tree.js";

export type Breakpoint = "desktop" | "tablet" | "mobile";
export type EditorMode = "edit" | "preview";
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface EditorState {
  loading: boolean;
  error: string | null;
  site: SiteDTO | null;
  workspaceId: string | null;
  pages: PageDTO[];
  page: PageDTO | null;
  tree: Block | null;
  brandKit: BrandKit | null;
  selectedId: string | null;
  breakpoint: Breakpoint;
  mode: EditorMode;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;

  loadEditor: (siteId: string) => Promise<void>;
  openPage: (pageId: string) => Promise<void>;
  addPage: (title: string) => Promise<void>;
  select: (id: string | null) => void;
  addBlock: (type: BlockType, parentId?: string, index?: number) => void;
  moveBlock: (id: string, toParentId: string, toIndex: number) => void;
  removeBlock: (id: string) => void;
  updateBlockProps: (id: string, patch: Record<string, unknown>) => void;
  setBreakpoint: (bp: Breakpoint) => void;
  setMode: (mode: EditorMode) => void;
  setSite: (site: SiteDTO) => void;
  updateBrandKit: (patch: Partial<BrandKit>) => void;
  saveNow: () => Promise<void>;
}

// Module-scoped debounce timers (editor is a singleton store).
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let brandTimer: ReturnType<typeof setTimeout> | null = null;

export const useEditorStore = create<EditorState>((set, get) => {
  /** Debounced autosave — 1.5s after the last edit, never per keystroke. */
  function scheduleSave() {
    set({ saveStatus: "dirty" });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void get().saveNow(), 1500);
  }

  /** Where a freshly added block should land, based on the current selection. */
  function resolveTarget(tree: Block, type: BlockType): { parentId: string; index: number } {
    const sel = get().selectedId;
    if (sel) {
      const node = findNode(tree, sel);
      if (node && isContainer(node.type)) {
        return { parentId: node.id, index: node.children.length };
      }
      const info = findParent(tree, sel);
      if (info) return { parentId: info.parent.id, index: info.index + 1 };
    }
    // Default: append to the root (a section), or wrap if root can't hold it.
    return { parentId: tree.id, index: tree.children.length };
  }

  return {
    loading: false,
    error: null,
    site: null,
    workspaceId: null,
    pages: [],
    page: null,
    tree: null,
    brandKit: null,
    selectedId: null,
    breakpoint: "desktop",
    mode: "edit",
    saveStatus: "idle",
    lastSavedAt: null,

    async loadEditor(siteId) {
      set({ loading: true, error: null });
      try {
        const [site, pages, brandKit] = await Promise.all([
          siteApi.get(siteId),
          pageApi.listForSite(siteId),
          siteApi.brandKit(siteId),
        ]);
        const home = pages.find((p) => p.isHome) ?? pages[0] ?? null;
        const page = home ? await pageApi.get(home.id) : null;
        set({
          loading: false,
          site,
          workspaceId: site.workspace,
          pages,
          page,
          tree: page ? (page.tree as Block) : null,
          brandKit,
          selectedId: null,
          saveStatus: "idle",
        });
      } catch (err) {
        set({ loading: false, error: err instanceof Error ? err.message : "Failed to load" });
      }
    },

    async openPage(pageId) {
      // Flush any pending save before switching pages.
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        await get().saveNow();
      }
      const page = await pageApi.get(pageId);
      set({ page, tree: page.tree as Block, selectedId: null, saveStatus: "idle" });
    },

    async addPage(title) {
      const site = get().site;
      if (!site) return;
      const created = await pageApi.create(site.id, { title });
      set({ pages: [...get().pages, created] });
      await get().openPage(created.id);
    },

    select: (id) => set({ selectedId: id }),

    addBlock(type, parentId, index) {
      const tree = get().tree;
      if (!tree) return;
      const block = makeBlock(type);
      const target =
        parentId != null ? { parentId, index: index ?? 0 } : resolveTarget(tree, type);
      const next = insertChild(tree, target.parentId, target.index, block);
      set({ tree: next, selectedId: block.id });
      scheduleSave();
    },

    moveBlock(id, toParentId, toIndex) {
      const tree = get().tree;
      if (!tree) return;
      set({ tree: moveNode(tree, id, toParentId, toIndex) });
      scheduleSave();
    },

    removeBlock(id) {
      const tree = get().tree;
      if (!tree || tree.id === id) return; // never remove the root
      const next = removeNode(tree, id);
      set({ tree: next, selectedId: get().selectedId === id ? null : get().selectedId });
      scheduleSave();
    },

    updateBlockProps(id, patch) {
      const tree = get().tree;
      if (!tree) return;
      set({ tree: updateProps(tree, id, patch) });
      scheduleSave();
    },

    setBreakpoint: (breakpoint) => set({ breakpoint }),
    setMode: (mode) => set({ mode }),
    setSite: (site) => set({ site }),

    updateBrandKit(patch) {
      const current = get().brandKit;
      const workspaceId = get().workspaceId;
      if (!current || !workspaceId) return;
      // Optimistic local update → instant token propagation in the canvas.
      const next = { ...current, ...patch } as BrandKit;
      set({ brandKit: next });
      if (brandTimer) clearTimeout(brandTimer);
      brandTimer = setTimeout(() => {
        void brandKitApi.update(workspaceId, patch).catch(() => undefined);
      }, 600);
    },

    async saveNow() {
      const { page, tree } = get();
      if (!page || !tree) return;
      set({ saveStatus: "saving" });
      try {
        const saved = await pageApi.save(page.id, { tree });
        set({
          saveStatus: "saved",
          lastSavedAt: Date.now(),
          page: { ...page, updatedAt: saved.updatedAt },
        });
      } catch {
        set({ saveStatus: "error" });
      }
    },
  };
});
