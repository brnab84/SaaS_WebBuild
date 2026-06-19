import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { renderDocument } from "@webforge/renderer";
import { publishedCache } from "../cache.js";
import type {
  PublishInput,
  PublishResult,
  PublishService,
} from "./PublishService.js";

/**
 * Writes each page to `<rootDir>/<siteSlug>/<pageSlug>.html` (home → index.html)
 * and primes the in-memory published cache. The Express app serves the result
 * statically/dynamically at /s/:siteSlug.
 */
export class LocalPublishService implements PublishService {
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor(opts: { rootDir: string; publicBaseUrl: string }) {
    this.rootDir = resolve(opts.rootDir);
    this.publicBaseUrl = opts.publicBaseUrl.replace(/\/$/, "");
  }

  get directory(): string {
    return this.rootDir;
  }

  private siteDir(siteSlug: string): string {
    return join(this.rootDir, siteSlug);
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const { site, brandKit, pages } = input;
    const dir = this.siteDir(site.slug);

    // Fresh output each publish; invalidate any stale cache first.
    publishedCache.invalidateSite(site.slug);
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });

    for (const page of pages) {
      const html = renderDocument({
        page: { title: page.title, tree: page.tree },
        site: { name: site.name, id: site.id },
        brandKit,
        options: { apiBase: input.apiBase },
      });
      const fileSlug = page.isHome ? "index" : page.slug;
      await fs.writeFile(join(dir, `${fileSlug}.html`), html, "utf8");
      publishedCache.set(site.slug, page.isHome ? "" : page.slug, html);
    }

    return {
      url: `${this.publicBaseUrl}/s/${site.slug}/`,
      pages: pages.length,
      publishedAt: new Date(),
    };
  }

  async unpublish(siteSlug: string): Promise<void> {
    publishedCache.invalidateSite(siteSlug);
    await fs.rm(this.siteDir(siteSlug), { recursive: true, force: true });
  }

  /** Read a published page's HTML from cache, falling back to disk. */
  async read(siteSlug: string, pageSlug: string): Promise<string | null> {
    const cached = publishedCache.get(siteSlug, pageSlug);
    if (cached != null) return cached;
    const fileSlug = pageSlug === "" ? "index" : pageSlug;
    try {
      const html = await fs.readFile(join(this.siteDir(siteSlug), `${fileSlug}.html`), "utf8");
      publishedCache.set(siteSlug, pageSlug, html);
      return html;
    } catch {
      return null;
    }
  }
}
