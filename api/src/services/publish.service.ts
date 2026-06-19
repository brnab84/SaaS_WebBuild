import type { Block, SiteDTO } from "@webforge/shared";
import { badRequest } from "../utils/http-error.js";
import { requireSite } from "./access.service.js";
import { brandKitForSite } from "./brandkit.service.js";
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
  const result = await publishService.publish({
    site: { slug: site.slug, name: site.name },
    brandKit,
    pages: pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      tree: p.tree as Block,
      isHome: p.isHome,
    })),
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
