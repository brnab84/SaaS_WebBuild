import {
  makeBlock,
  makeStarterTree,
  type Block,
  type SectionBlock,
  type UpdateBrandKitInput,
} from "@webforge/shared";
import { slugify, withRandomSuffix } from "../../utils/slug.js";
import type { AiBlock, AiSitePlan } from "./plan.schema.js";

export interface BuiltPage {
  title: string;
  slug: string;
  isHome: boolean;
  tree: Block;
}

export interface BuiltSite {
  siteName: string;
  brand: UpdateBrandKitInput;
  pages: BuiltPage[];
}

/** Drop undefined keys so we only override the block defaults that were set. */
function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/** Convert one AI block descriptor into a valid block (defaults + overrides). */
function toBlock(b: AiBlock): Block {
  switch (b.type) {
    case "hero": {
      const node = makeBlock("hero");
      Object.assign(
        node.props,
        defined({
          eyebrow: b.eyebrow,
          title: b.title,
          subtitle: b.subtitle,
          ctaLabel: b.ctaLabel,
          ctaHref: b.ctaHref,
          align: b.align,
        }),
      );
      return node;
    }
    case "text": {
      const node = makeBlock("text");
      Object.assign(
        node.props,
        defined({ content: b.content ?? b.title, size: b.size, align: b.align }),
      );
      return node;
    }
    case "image": {
      const node = makeBlock("image");
      // The model has no real image URLs — use a labelled placeholder.
      const label = encodeURIComponent((b.alt ?? "Image").slice(0, 40));
      Object.assign(
        node.props,
        defined({
          src: `https://placehold.co/1200x675?text=${label}`,
          alt: b.alt,
          align: b.align,
        }),
      );
      return node;
    }
    case "button": {
      const node = makeBlock("button");
      Object.assign(
        node.props,
        defined({
          label: b.label ?? b.ctaLabel,
          href: b.href ?? b.ctaHref,
          variant: b.variant,
          align: b.align,
        }),
      );
      return node;
    }
    default:
      return makeBlock("text");
  }
}

/**
 * Build a complete, valid site (brand patch + page trees) from an AI plan.
 * Pure & deterministic — unit-tested without calling the model.
 */
export function buildSiteFromPlan(plan: AiSitePlan): BuiltSite {
  const usedSlugs = new Set<string>();
  const pages: BuiltPage[] = plan.pages.map((p, i) => {
    const root = makeBlock("section") as SectionBlock;
    root.props.padding = "lg";
    root.props.gap = "md";
    root.children = p.blocks.map(toBlock);
    if (root.children.length === 0) root.children = makeStarterTree().children;

    let slug = i === 0 ? "index" : slugify(p.slug || p.title);
    while (usedSlugs.has(slug)) slug = withRandomSuffix(slug);
    usedSlugs.add(slug);

    return { title: p.title || (i === 0 ? "Home" : `Page ${i + 1}`), slug, isHome: i === 0, tree: root };
  });

  // Always guarantee at least a home page.
  if (pages.length === 0) {
    pages.push({ title: "Home", slug: "index", isHome: true, tree: makeStarterTree() });
  }

  const brand: UpdateBrandKitInput = {
    colors: plan.brand.colors,
    fonts: {
      heading: plan.brand.fonts.heading,
      body: plan.brand.fonts.body,
      googleFonts: plan.brand.fonts.googleFonts ?? [],
    },
  };

  return { siteName: plan.siteName || "AI site", brand, pages };
}
