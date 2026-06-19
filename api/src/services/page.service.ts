import {
  makeStarterTree,
  type CreatePageInput,
  type PageDTO,
  type SavePageInput,
} from "@webforge/shared";
import { Page, type PageDoc } from "../models/Page.js";
import { forbidden, notFound } from "../utils/http-error.js";
import { slugify, withRandomSuffix } from "../utils/slug.js";
import { requireSite } from "./access.service.js";

export function toPageDTO(page: PageDoc): PageDTO {
  return {
    id: page._id.toString(),
    site: page.site.toString(),
    title: page.title,
    slug: page.slug,
    tree: page.tree,
    isHome: page.isHome,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

/** Load a page and verify the caller can access its site, or throw. */
async function requirePage(
  pageId: string,
  userId: string,
): Promise<import("mongoose").HydratedDocument<PageDoc>> {
  const page = await Page.findById(pageId);
  if (!page) throw notFound("Page not found");
  await requireSite(page.site.toString(), userId);
  return page;
}

export async function listPages(siteId: string, userId: string): Promise<PageDTO[]> {
  await requireSite(siteId, userId);
  const pages = await Page.find({ site: siteId }).sort({ isHome: -1, createdAt: 1 });
  return pages.map(toPageDTO);
}

export async function createPage(
  siteId: string,
  userId: string,
  input: CreatePageInput,
): Promise<PageDTO> {
  await requireSite(siteId, userId);
  let slug = slugify(input.slug || input.title);
  while (await Page.exists({ site: siteId, slug })) slug = withRandomSuffix(slug);

  const page = await Page.create({
    site: siteId,
    title: input.title,
    slug,
    tree: makeStarterTree(),
    isHome: false,
  });
  return toPageDTO(page);
}

export async function getPage(pageId: string, userId: string): Promise<PageDTO> {
  return toPageDTO(await requirePage(pageId, userId));
}

/**
 * Autosave entry point. The full validated block tree replaces the stored one.
 * The editor calls this debounced (1.5s) — never per keystroke.
 */
export async function savePage(
  pageId: string,
  userId: string,
  input: SavePageInput,
): Promise<PageDTO> {
  const page = await requirePage(pageId, userId);
  if (input.title !== undefined) page.title = input.title;
  if (input.tree !== undefined) {
    page.tree = input.tree;
    page.markModified("tree");
  }
  await page.save();
  return toPageDTO(page);
}

export async function deletePage(pageId: string, userId: string): Promise<void> {
  const page = await requirePage(pageId, userId);
  if (page.isHome) throw forbidden("Cannot delete the home page");
  await page.deleteOne();
}

/** Used by publishing: load all pages of a site (lean for render speed). */
export async function pagesForPublish(siteId: string) {
  return Page.find({ site: siteId }).lean();
}
