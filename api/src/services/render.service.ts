import type { Block } from "@webforge/shared";
import { renderDocument } from "@webforge/renderer";
import { env } from "../config/env.js";
import { Page } from "../models/Page.js";
import { notFound } from "../utils/http-error.js";
import { requireSite } from "./access.service.js";
import { brandKitForSite } from "./brandkit.service.js";
import { hydrateTree } from "./hydrate.service.js";

/**
 * Render a DRAFT page to a full HTML document for the editor's live preview.
 * Requires the caller to have access to the page's site.
 */
export async function renderPagePreview(pageId: string, userId: string): Promise<string> {
  const page = await Page.findById(pageId);
  if (!page) throw notFound("Page not found");
  const site = await requireSite(page.site.toString(), userId);
  const brandKit = await brandKitForSite(site._id.toString());
  const tree = await hydrateTree(page.tree as Block, {
    workspaceId: site.workspace.toString(),
    siteId: site._id.toString(),
  });
  return renderDocument({
    page: { title: page.title, tree },
    site: { name: site.name, id: site._id.toString() },
    brandKit,
    options: { apiBase: env.PUBLIC_URL },
  });
}

/** Render a draft page by site + page slug (used by the public /preview route). */
export async function renderPreviewBySlug(
  siteId: string,
  pageSlug: string,
  userId: string,
): Promise<string> {
  const site = await requireSite(siteId, userId);
  const page = await Page.findOne({ site: site._id, slug: pageSlug });
  if (!page) throw notFound("Page not found");
  const brandKit = await brandKitForSite(site._id.toString());
  const tree = await hydrateTree(page.tree as Block, {
    workspaceId: site.workspace.toString(),
    siteId: site._id.toString(),
  });
  return renderDocument({
    page: { title: page.title, tree },
    site: { name: site.name, id: site._id.toString() },
    brandKit,
    options: { apiBase: env.PUBLIC_URL },
  });
}

/** Resolve the home page slug for serving a published site root. */
export async function homePageSlug(siteId: string): Promise<string> {
  const home = await Page.findOne({ site: siteId, isHome: true });
  return home?.slug ?? "index";
}
