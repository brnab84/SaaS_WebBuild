import { describe, it, expect } from "vitest";
import {
  makeBlock,
  makeStarterTree,
  blockSchema,
  pageTreeSchema,
  isContainer,
} from "./blocks.js";

describe("block factories", () => {
  it("creates a block with schema-default props and a fresh id", () => {
    const a = makeBlock("hero");
    const b = makeBlock("hero");
    expect(a.type).toBe("hero");
    expect(a.id).not.toEqual(b.id);
    expect(a.props.title.length).toBeGreaterThan(0);
    expect(a.children).toEqual([]);
  });

  it("only sections are containers", () => {
    expect(isContainer("section")).toBe(true);
    expect(isContainer("text")).toBe(false);
    expect(isContainer("button")).toBe(false);
  });
});

describe("recursive tree schema", () => {
  it("parses a nested starter tree", () => {
    const tree = makeStarterTree();
    const parsed = pageTreeSchema.parse(tree);
    expect(parsed.type).toBe("section");
    expect(parsed.children).toHaveLength(2);
  });

  it("rejects an unknown block type", () => {
    const bad = { id: "1", type: "carousel", props: {}, children: [] };
    expect(() => blockSchema.parse(bad)).toThrow();
  });

  it("applies prop defaults when parsing partial props", () => {
    const node = { id: "1", type: "text", props: { content: "hi" }, children: [] };
    const parsed = blockSchema.parse(node);
    expect(parsed.props).toMatchObject({ content: "hi", size: "md", align: "left" });
  });
});
