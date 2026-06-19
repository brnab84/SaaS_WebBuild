import { describe, it, expect } from "vitest";
import { makeBlock, type SectionBlock, type TextBlock } from "@webforge/shared";
import {
  cloneTree,
  containerIds,
  findNode,
  findParent,
  insertChild,
  moveNode,
  removeNode,
  updateProps,
} from "./tree.js";

/** Build: root[ A[ t1 ], t2 ] where A is a nested section. */
function sample() {
  const root = makeBlock("section") as SectionBlock;
  const a = makeBlock("section") as SectionBlock;
  const t1 = makeBlock("text") as TextBlock;
  const t2 = makeBlock("text") as TextBlock;
  t1.props.content = "T1";
  t2.props.content = "T2";
  a.children = [t1];
  root.children = [a, t2];
  return { root, a, t1, t2 };
}

describe("tree lookups", () => {
  it("finds nodes and their parents at any depth", () => {
    const { root, a, t1 } = sample();
    expect(findNode(root, t1.id)?.id).toBe(t1.id);
    const info = findParent(root, t1.id);
    expect(info?.parent.id).toBe(a.id);
    expect(info?.index).toBe(0);
  });

  it("lists only container (section) ids as drop targets", () => {
    const { root, a } = sample();
    expect(containerIds(root).sort()).toEqual([root.id, a.id].sort());
  });
});

describe("insertChild", () => {
  it("inserts at the given index and is immutable", () => {
    const { root, a } = sample();
    const block = makeBlock("button");
    const next = insertChild(root, a.id, 0, block);
    expect(findNode(next, a.id)!.children[0]!.id).toBe(block.id);
    // original untouched
    expect(findNode(root, a.id)!.children).toHaveLength(1);
  });

  it("clamps an out-of-range index", () => {
    const { root } = sample();
    const block = makeBlock("text");
    const next = insertChild(root, root.id, 999, block);
    expect(findNode(next, root.id)!.children.at(-1)!.id).toBe(block.id);
  });
});

describe("removeNode", () => {
  it("removes a node but never the root", () => {
    const { root, t2 } = sample();
    const next = removeNode(root, t2.id);
    expect(findNode(next, t2.id)).toBeNull();
    expect(removeNode(next, next.id).id).toBe(next.id); // root survives
  });
});

describe("moveNode", () => {
  it("moves a node across parents", () => {
    const { root, a, t1 } = sample();
    const next = moveNode(root, t1.id, root.id, 0);
    expect(findParent(next, t1.id)!.parent.id).toBe(root.id);
    expect(findNode(next, a.id)!.children).toHaveLength(0);
  });

  it("reorders within the same parent", () => {
    const root = makeBlock("section") as SectionBlock;
    const x = makeBlock("text");
    const y = makeBlock("text");
    const z = makeBlock("text");
    root.children = [x, y, z];
    const next = moveNode(root, x.id, root.id, 2); // move first to last
    expect(findNode(next, root.id)!.children.map((c) => c.id)).toEqual([y.id, z.id, x.id]);
  });

  it("refuses to move a node into its own descendant", () => {
    const { root, a, t1 } = sample();
    // try to move A into t1 (its child) — should no-op
    const next = moveNode(root, a.id, t1.id, 0);
    expect(findParent(next, a.id)!.parent.id).toBe(root.id);
  });
});

describe("updateProps", () => {
  it("shallow-merges props immutably", () => {
    const { root, t1 } = sample();
    const next = updateProps(root, t1.id, { content: "changed" });
    expect((findNode(next, t1.id) as TextBlock).props.content).toBe("changed");
    expect((findNode(root, t1.id) as TextBlock).props.content).toBe("T1");
  });
});

describe("cloneTree", () => {
  it("produces an independent deep copy", () => {
    const { root, t1 } = sample();
    const copy = cloneTree(root);
    (findNode(copy, t1.id) as TextBlock).props.content = "x";
    expect((findNode(root, t1.id) as TextBlock).props.content).toBe("T1");
  });
});
