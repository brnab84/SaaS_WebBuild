import type { Block, SiteDTO } from "@webforge/shared";
import { env } from "../config/env.js";
import { Site } from "../models/Site.js";
import { badRequest } from "../utils/http-error.js";
import { requireSite } from "./access.service.js";
import { brandKitForSite } from "./brandkit.service.js";
import { hydrateTree } from "./hydrate.service.js";
import { pagesForPublish } from "./page.service.js";
import { publishService } from "./publish/index.js";
import { toSiteDTO } from "./site.service.js";

export interface PublishSiteResult {
  url: string;
  pages: number;
  publishedAt: string;
  site: SiteDTO;
}

/** Render every page of a site and hand off to the configured PublishService. */
export async function publishSite(
  siteId: string,
  userId: string,
): Promise<PublishSiteResult> {
  const site = await requireSite(siteId, userId);
  const pages = await pagesForPublish(site._id.toString());
  if (pages.length === 0) throw badRequest("Site has no pages to publish");

  const brandKit = await brandKitForSite(site._id.toString());
  const workspaceId = site.workspace.toString();
  const hydratedPages = await Promise.all(
    pages.map(async (p) => ({
      slug: p.slug,
      title: p.title,
      tree: await hydrateTree(p.tree as Block, { workspaceId, siteId }),
      isHome: p.isHome,
    })),
  );
  const result = await publishService.publish({
    site: { slug: site.slug, name: site.name, id: siteId },
    brandKit,
    pages: hydratedPages,
    apiBase: env.PUBLIC_URL,
  });

  site.status = "published";
  site.publishedAt = result.publishedAt;
  await site.save();

  return {
    url: result.url,
    pages: result.pages,
    publishedAt: result.publishedAt.toISOString(),
    site: toSiteDTO(site),
  };
}

export async function unpublishSite(siteId: string, userId: string): Promise<SiteDTO> {
  const site = await requireSite(siteId, userId);
  await publishService.unpublish(site.slug);
  site.status = "draft";
  site.publishedAt = null;
  await site.save();
  return toSiteDTO(site);
}

/** Serve a published page (cache-first via the driver's read()), or null. */
export async function readPublishedPage(
  siteSlug: string,
  pageSlug: string,
): Promise<string | null> {
  if (typeof publishService.read !== "function") return null;
  return publishService.read(siteSlug, pageSlug);
}

/**
 * Resolve a request to a published site by its custom domain (Phase 5). Returns
 * the page HTML, or null if no published site claims that hostname.
 */
export async function serveCustomDomainPage(
  hostname: string,
  path: string,
): Promise<string | null> {
  const site = await Site.findOne({ customDomain: hostname, status: "published" });
  if (!site) return null;
  const pageSlug =
    path === "/" || path === "" ? "" : path.replace(/^\//, "").replace(/\.html$/, "");
  return readPublishedPage(site.slug, pageSlug);
}
