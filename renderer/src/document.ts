import type { Block, BrandKit } from "@webforge/shared";
import { brandKitToCssVars } from "@webforge/shared";
import { escapeAttr, escapeHtml } from "./escape.js";
import { renderTree } from "./render.js";

/** Minimal, opinionated reset so published pages look the same everywhere. */
export const RESET_CSS =
  "*,*::before,*::after{box-sizing:border-box}" +
  "html{-webkit-text-size-adjust:100%}" +
  "body{margin:0;font-family:var(--wf-font-body);color:var(--wf-color-text);" +
  "background:var(--wf-color-bg);line-height:1.5;-webkit-font-smoothing:antialiased}" +
  "img{max-width:100%}h1,h2,h3,p{margin:0}a{color:inherit}";

/** Serialize a BrandKit into a `:root{ --wf-* }` declaration block. */
export function renderBrandKitVars(kit: BrandKit): string {
  const vars = brandKitToCssVars(kit);
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${String(v).replace(/[;{}<>]/g, "")}`)
    .join(";");
  return `:root{${body}}`;
}

/** Build a Google Fonts <link> for the families declared in the BrandKit. */
export function googleFontsLink(kit: BrandKit): string {
  const families = kit.fonts.googleFonts.filter(Boolean);
  if (families.length === 0) return "";
  const query = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return (
    `<link rel="preconnect" href="https://fonts.googleapis.com">` +
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${query}&display=swap">`
  );
}

export interface RenderPageInput {
  page: { title: string; tree: Block; description?: string };
  site: { name: string; id?: string };
  brandKit: BrandKit;
  options?: {
    /** Inject Google Fonts links (default true). */
    includeFonts?: boolean;
    lang?: string;
    /** Public API origin used by dynamic blocks (products/events/form). */
    apiBase?: string;
  };
}

/** JS string literal, safe to embed inside a <script> tag. */
function jsString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Render a complete, self-contained static HTML document for a page.
 * This is what `PublishService` writes to disk and what preview serves.
 */
export function renderDocument(input: RenderPageInput): string {
  const { page, site, brandKit, options } = input;
  const includeFonts = options?.includeFonts ?? true;
  const lang = options?.lang ?? "en";

  const { html, css } = renderTree(page.tree);
  const desc = page.description
    ? `<meta name="description" content="${escapeAttr(page.description)}">`
    : "";
  const head =
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escapeHtml(page.title)} · ${escapeHtml(site.name)}</title>` +
    desc +
    `<meta name="generator" content="WebForge">` +
    (includeFonts ? googleFontsLink(brandKit) : "") +
    `<style>${renderBrandKitVars(brandKit)}${RESET_CSS}${css}</style>`;

  // Bootstrap dynamic blocks (products/events/form) with the site id + API base.
  const bootstrap =
    `<script>window.__WF={siteId:${jsString(site.id ?? "")},` +
    `apiBase:${jsString(options?.apiBase ?? "")}};</script>`;

  return (
    `<!doctype html><html lang="${escapeHtml(lang)}"><head>${head}</head>` +
    `<body>${bootstrap}${html}</body></html>`
  );
}
