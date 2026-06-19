import {
  makeStarterTree,
  type CreateSiteInput,
  type Paginated,
  type PaginationQuery,
  type SiteDTO,
  type UpdateSiteInput,
} from "@webforge/shared";
import { Page } from "../models/Page.js";
import { Site, type SiteDoc } from "../models/Site.js";
import { badRequest, conflict } from "../utils/http-error.js";
import { slugify, withRandomSuffix } from "../utils/slug.js";
import { accessibleWorkspaceIds, requireSite, requireWorkspace } from "./access.service.js";
import { publishService } from "./publish/index.js";

export function toSiteDTO(site: SiteDoc): SiteDTO {
  return {
    id: site._id.toString(),
    workspace: site.workspace.toString(),
    name: site.name,
    slug: site.slug,
    status: site.status,
    publishedAt: site.publishedAt ? site.publishedAt.toISOString() : null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

export async function uniqueSiteSlug(desired: string): Promise<string> {
  let slug = slugify(desired);
  while (await Site.exists({ slug })) slug = withRandomSuffix(slugify(desired));
  return slug;
}

export async function createSite(
  workspaceId: string,
  userId: string,
  input: CreateSiteInput,
): Promise<SiteDTO> {
  await requireWorkspace(workspaceId, userId);
  const slug = await uniqueSiteSlug(input.slug || input.name);

  const site = await Site.create({ workspace: workspaceId, name: input.name, slug });

  // Every new site gets a Home page with a starter tree.
  const home = await Page.create({
    site: site._id,
    title: "Home",
    slug: "index",
    tree: makeStarterTree(),
    isHome: true,
  });
  site.homePage = home._id;
  await site.save();

  return toSiteDTO(site);
}

export async function listSites(
  userId: string,
  query: PaginationQuery & { workspaceId?: string },
): Promise<Paginated<SiteDTO>> {
  const filter: Record<string, unknown> = {};
  if (query.workspaceId) {
    await requireWorkspace(query.workspaceId, userId);
    filter.workspace = query.workspaceId;
  } else {
    filter.workspace = { $in: await accessibleWorkspaceIds(userId) };
  }

  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Site.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Site.countDocuments(filter),
  ]);

  return {
    items: items.map(toSiteDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getSite(siteId: string, userId: string): Promise<SiteDTO> {
  return toSiteDTO(await requireSite(siteId, userId));
}

export async function updateSite(
  siteId: string,
  userId: string,
  input: UpdateSiteInput,
): Promise<SiteDTO> {
  const site = await requireSite(siteId, userId);
  if (input.name !== undefined) site.name = input.name;
  if (input.slug !== undefined && input.slug !== site.slug) {
    const slug = slugify(input.slug);
    if (await Site.exists({ slug, _id: { $ne: site._id } })) throw conflict("Slug already in use");
    site.slug = slug;
  }
  await site.save();
  return toSiteDTO(site);
}

export async function deleteSite(siteId: string, userId: string): Promise<void> {
  const site = await requireSite(siteId, userId);
  await publishService.unpublish(site.slug).catch(() => undefined);
  await Page.deleteMany({ site: site._id });
  await site.deleteOne();
}

export function ensureSiteExists(site: SiteDoc | null): asserts site is SiteDoc {
  if (!site) throw badRequest("Site not found");
}
