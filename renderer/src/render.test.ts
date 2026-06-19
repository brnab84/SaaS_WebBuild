import { describe, it, expect } from "vitest";
import {
  makeBlock,
  makeStarterTree,
  defaultBrandKit,
  type Block,
  type BrandKit,
  type HeroBlock,
  type SectionBlock,
} from "@webforge/shared";
import { renderTree, renderDocument, renderBrandKitVars } from "./index.js";

describe("renderTree", () => {
  it("renders a hero block with its title and CTA", () => {
    const hero = makeBlock("hero") as HeroBlock;
    hero.props.title = "Launch faster";
    hero.props.ctaLabel = "Start now";
    const { html, css } = renderTree(hero);
    expect(html).toContain("Launch faster");
    expect(html).toContain("Start now");
    expect(html).toContain(`class="wf-${hero.id}"`);
    expect(css).toContain(`.wf-${hero.id}`);
  });

  it("escapes HTML in user content to prevent injection", () => {
    const text = makeBlock("text") as Extract<Block, { type: "text" }>;
    text.props.content = "<script>alert('x')</script>";
    const { html } = renderTree(text);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("blocks dangerous URLs in buttons", () => {
    const btn = makeBlock("button") as Extract<Block, { type: "button" }>;
    btn.props.href = "javascript:alert(1)";
    const { html } = renderTree(btn);
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="#"');
  });

  it("renders nested children in order", () => {
    const root = makeBlock("section") as SectionBlock;
    const a = makeBlock("text") as Extract<Block, { type: "text" }>;
    const b = makeBlock("text") as Extract<Block, { type: "text" }>;
    a.props.content = "FIRST";
    b.props.content = "SECOND";
    root.children = [a, b];
    const { html } = renderTree(root);
    expect(html.indexOf("FIRST")).toBeLessThan(html.indexOf("SECOND"));
    expect(html.indexOf("FIRST")).toBeGreaterThan(-1);
  });
});

describe("design-token propagation", () => {
  it("block styles reference BrandKit CSS variables, not literal colors", () => {
    const hero = makeBlock("hero");
    const { css } = renderTree(hero);
    // The hero CTA + eyebrow are tied to the primary token.
    expect(css).toContain("var(--wf-color-primary)");
  });

  it("renderBrandKitVars emits the :root custom properties", () => {
    const css = renderBrandKitVars(defaultBrandKit);
    expect(css).toContain(":root{");
    expect(css).toContain(`--wf-color-primary:${defaultBrandKit.colors.primary}`);
    expect(css).toContain("--wf-font-heading:");
    expect(css).toContain("--wf-space-lg:");
  });

  it("changing a token changes only :root, propagating everywhere", () => {
    const kitA: BrandKit = defaultBrandKit;
    const kitB: BrandKit = {
      ...defaultBrandKit,
      colors: { ...defaultBrandKit.colors, primary: "#ff0000" },
    };
    const hero = makeBlock("hero");
    const body = renderTree(hero).css; // identical regardless of kit
    expect(body).toContain("var(--wf-color-primary)");
    expect(renderBrandKitVars(kitA)).toContain("--wf-color-primary:#4f46e5");
    expect(renderBrandKitVars(kitB)).toContain("--wf-color-primary:#ff0000");
  });
});

describe("dynamic blocks (products / events / form)", () => {
  it("renders a form block that posts to the storefront", () => {
    const form = makeBlock("form") as Extract<Block, { type: "form" }>;
    form.props.title = "Contact us";
    const { html } = renderTree(form);
    expect(html).toContain("Contact us");
    expect(html).toContain("<form");
    expect(html).toContain("/forms/");
    expect(html).toContain("<script>");
  });

  it("renders products from injected _items with a buy action", () => {
    const products = makeBlock("products") as Extract<Block, { type: "products" }>;
    products.props._items = [
      { id: "p1", title: "Hoodie", priceCents: 4999, currency: "USD", image: null },
    ];
    const { html } = renderTree(products);
    expect(html).toContain("Hoodie");
    expect(html).toContain("USD 49.99");
    expect(html).toContain('data-pid="p1"');
    expect(html).toContain("/checkout");
  });

  it("renders events from injected _items with an RSVP form", () => {
    const events = makeBlock("events") as Extract<Block, { type: "events" }>;
    events.props._items = [
      { id: "e1", title: "Launch", startsAt: new Date().toISOString(), location: "HQ", spotsLeft: 5 },
    ];
    const { html } = renderTree(events);
    expect(html).toContain("Launch");
    expect(html).toContain('data-eid="e1"');
    expect(html).toContain("/rsvp");
  });

  it("emits the __WF bootstrap with site id + api base", () => {
    const doc = renderDocument({
      page: { title: "Shop", tree: makeBlock("products") },
      site: { name: "Acme", id: "site123" },
      brandKit: defaultBrandKit,
      options: { apiBase: "https://api.example.com" },
    });
    expect(doc).toContain('window.__WF=');
    expect(doc).toContain("site123");
    expect(doc).toContain("https://api.example.com");
  });
});

describe("renderDocument", () => {
  it("produces a complete, self-contained HTML document", () => {
    const tree = makeStarterTree();
    const doc = renderDocument({
      page: { title: "Home", tree },
      site: { name: "Acme" },
      brandKit: defaultBrandKit,
    });
    expect(doc.startsWith("<!doctype html>")).toBe(true);
    expect(doc).toContain("<title>Home · Acme</title>");
    expect(doc).toContain(":root{");
    expect(doc).toContain("box-sizing:border-box");
    expect(doc).toContain("fonts.googleapis.com");
    expect(doc).toContain("</body></html>");
  });

  it("can omit Google Fonts when requested", () => {
    const doc = renderDocument({
      page: { title: "P", tree: makeBlock("text") },
      site: { name: "S" },
      brandKit: defaultBrandKit,
      options: { includeFonts: false },
    });
    expect(doc).not.toContain("fonts.googleapis.com");
  });
});
