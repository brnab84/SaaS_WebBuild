import type { Block } from "@webforge/shared";
import { REGISTRY, type Rendered } from "./registry.js";

/**
 * Walk a block tree depth-first, producing the body HTML and the collected,
 * scoped CSS (one block → one `.wf-<id>` class, so rules never collide).
 */
export function renderTree(tree: Block): Rendered {
  const cssParts: string[] = [];

  function walk(node: Block): string {
    const cls = `wf-${node.id}`;
    let childrenHtml = "";
    for (const child of node.children) childrenHtml += walk(child);
    const renderer = REGISTRY[node.type] as (a: {
      cls: string;
      props: unknown;
      childrenHtml: string;
    }) => Rendered;
    const out = renderer({ cls, props: node.props, childrenHtml });
    if (out.css) cssParts.push(out.css);
    return out.html;
  }

  const html = walk(tree);
  return { html, css: cssParts.join("\n") };
}
