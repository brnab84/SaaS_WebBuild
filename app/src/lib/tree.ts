import type { Block, BlockType } from "@webforge/shared";
import { isContainer } from "@webforge/shared";

/** Deep clone a tree (browser + node both expose structuredClone). */
export function cloneTree(tree: Block): Block {
  return structuredClone(tree);
}

/** Find a node by id (depth-first). Returns the live reference within `tree`. */
export function findNode(tree: Block, id: string): Block | null {
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export interface ParentInfo {
  parent: Block;
  index: number;
}

/** Locate a node's parent and its index within that parent. */
export function findParent(tree: Block, id: string): ParentInfo | null {
  for (let i = 0; i < tree.children.length; i++) {
    if (tree.children[i]!.id === id) return { parent: tree, index: i };
    const deeper = findParent(tree.children[i]!, id);
    if (deeper) return deeper;
  }
  return null;
}

/** Collect every container node id (drop targets). */
export function containerIds(tree: Block): string[] {
  const ids: string[] = [];
  const walk = (n: Block) => {
    if (isContainer(n.type as BlockType)) ids.push(n.id);
    n.children.forEach(walk);
  };
  walk(tree);
  return ids;
}

/** Return a new tree with `node` inserted into `parentId` at `index`. */
export function insertChild(tree: Block, parentId: string, index: number, node: Block): Block {
  const next = cloneTree(tree);
  const parent = findNode(next, parentId);
  if (!parent) return next;
  const i = Math.max(0, Math.min(index, parent.children.length));
  parent.children.splice(i, 0, node);
  return next;
}

/** Return a new tree with the node `id` removed (root is never removed). */
export function removeNode(tree: Block, id: string): Block {
  const next = cloneTree(tree);
  const info = findParent(next, id);
  if (info) info.parent.children.splice(info.index, 1);
  return next;
}

/** Move node `id` into `toParentId` at `toIndex`. No-op if target is invalid. */
export function moveNode(tree: Block, id: string, toParentId: string, toIndex: number): Block {
  if (id === toParentId) return tree;
  const next = cloneTree(tree);
  const info = findParent(next, id);
  const target = findNode(next, toParentId);
  if (!info || !target) return next;

  // Prevent moving a node into its own descendant.
  if (findNode(info.parent.children[info.index]!, toParentId)) return next;

  const [moved] = info.parent.children.splice(info.index, 1);
  if (!moved) return next;
  let i = Math.max(0, Math.min(toIndex, target.children.length));
  // Adjust if removing earlier in the same parent shifted indices.
  if (info.parent.id === target.id && info.index < i) i -= 1;
  target.children.splice(i, 0, moved);
  return next;
}

/** Return a new tree with `id`'s props shallow-merged with `patch`. */
export function updateProps(
  tree: Block,
  id: string,
  patch: Record<string, unknown>,
): Block {
  const next = cloneTree(tree);
  const node = findNode(next, id);
  if (node) node.props = { ...node.props, ...patch } as Block["props"];
  return next;
}
