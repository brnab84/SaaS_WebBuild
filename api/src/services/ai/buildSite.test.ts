import { describe, it, expect } from "vitest";
import { pageTreeSchema, type SectionBlock } from "@webforge/shared";
import { buildSiteFromPlan } from "./buildSite.js";
import { monogramSvg } from "./logo.js";
import type { AiSitePlan } from "./plan.schema.js";

const plan: AiSitePlan = {
  siteName: "Bloom Café",
  brand: {
    colors: {
      primary: "#2f6b4f",
      secondary: "#caa15a",
      accent: "#e2725b",
      bg: "#fffaf3",
      surface: "#f3ece0",
      text: "#23201b",
      muted: "#7a7165",
    },
    fonts: { heading: "Fraunces, serif", body: "Karla, sans-serif", googleFonts: ["Fraunces"] },
  },
  pages: [
    {
      title: "Home",
      slug: "home",
      blocks: [
        { type: "hero", title: "Fresh, local, every morning", subtitle: "Specialty coffee.", ctaLabel: "Visit us", ctaHref: "#visit" },
        { type: "text", content: "We roast in small batches." },
        { type: "image", alt: "Latte art" },
        { type: "button", label: "Order online", href: "#order", variant: "outline" },
      ],
    },
    { title: "Menu", slug: "menu", blocks: [{ type: "text", content: "Our menu" }] },
  ],
};

describe("buildSiteFromPlan", () => {
  const built = buildSiteFromPlan(plan);

  it("produces a home page named index plus the secondary page", () => {
    expect(built.pages).toHaveLength(2);
    expect(built.pages[0]!.isHome).toBe(true);
    expect(built.pages[0]!.slug).toBe("index");
    expect(built.pages[1]!.slug).toBe("menu");
  });

  it("builds valid block trees from the flat plan", () => {
    for (const page of built.pages) {
      expect(() => pageTreeSchema.parse(page.tree)).not.toThrow();
    }
    const root = built.pages[0]!.tree as SectionBlock;
    expect(root.type).toBe("section");
    expect(root.children.map((c) => c.type)).toEqual(["hero", "text", "image", "button"]);
  });

  it("carries the AI-chosen palette and fonts into the brand patch", () => {
    expect(built.brand.colors?.primary).toBe("#2f6b4f");
    expect(built.brand.fonts?.heading).toContain("Fraunces");
  });

  it("uses a labelled placeholder for AI images (no real URL available)", () => {
    const root = built.pages[0]!.tree as SectionBlock;
    const img = root.children.find((c) => c.type === "image");
    expect(img && img.type === "image" && img.props.src).toContain("placehold.co");
  });

  it("falls back to a starter home page when the plan has no pages", () => {
    const empty = buildSiteFromPlan({ ...plan, pages: [] });
    expect(empty.pages).toHaveLength(1);
    expect(empty.pages[0]!.isHome).toBe(true);
  });
});

describe("monogramSvg (logo maker)", () => {
  it("derives initials and embeds the primary color", () => {
    const svg = monogramSvg("Bloom Café", "#2f6b4f");
    expect(svg).toContain("<svg");
    expect(svg).toContain(">BC<");
    expect(svg).toContain("#2f6b4f");
  });

  it("falls back to W for an empty name", () => {
    expect(monogramSvg("", "#000000")).toContain(">W<");
  });
});
