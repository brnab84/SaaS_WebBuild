import {
  brandKitSchema,
  type BrandKit as BrandKitTokens,
  type UpdateBrandKitInput,
} from "@webforge/shared";
import { BrandKit, type BrandKitDoc } from "../models/BrandKit.js";
import { Site } from "../models/Site.js";
import { notFound } from "../utils/http-error.js";
import { requireSite, requireWorkspace } from "./access.service.js";

/** Strip Mongo bookkeeping, returning a plain BrandKit the renderer can use. */
export function toBrandKit(doc: BrandKitDoc): BrandKitTokens {
  return {
    name: doc.name,
    colors: doc.colors,
    fonts: doc.fonts,
    spacing: doc.spacing,
    radius: doc.radius,
    logo: doc.logo,
  };
}

export async function getWorkspaceBrandKit(
  workspaceId: string,
  userId: string,
): Promise<BrandKitTokens> {
  await requireWorkspace(workspaceId, userId);
  const kit = await BrandKit.findOne({ workspace: workspaceId });
  if (!kit) throw notFound("BrandKit not found");
  return toBrandKit(kit);
}

export async function updateWorkspaceBrandKit(
  workspaceId: string,
  userId: string,
  patch: UpdateBrandKitInput,
): Promise<BrandKitTokens> {
  await requireWorkspace(workspaceId, userId);
  const kit = await BrandKit.findOne({ workspace: workspaceId });
  if (!kit) throw notFound("BrandKit not found");

  // Merge then re-validate the whole token set so we never persist a broken kit.
  const merged = brandKitSchema.parse({ ...toBrandKit(kit), ...patch });
  kit.name = merged.name;
  kit.colors = merged.colors;
  kit.fonts = merged.fonts;
  kit.spacing = merged.spacing;
  kit.radius = merged.radius;
  kit.logo = merged.logo;
  kit.markModified("colors");
  kit.markModified("fonts");
  kit.markModified("spacing");
  kit.markModified("radius");
  await kit.save();
  return toBrandKit(kit);
}

/** Get a site's BrandKit with an access check (editor convenience endpoint). */
export async function getSiteBrandKit(
  siteId: string,
  userId: string,
): Promise<BrandKitTokens> {
  await requireSite(siteId, userId);
  return brandKitForSite(siteId);
}

/** Internal: resolve the BrandKit for a site (via its workspace) for rendering. */
export async function brandKitForSite(siteId: string): Promise<BrandKitTokens> {
  const site = await Site.findById(siteId);
  if (!site) throw notFound("Site not found");
  const kit = await BrandKit.findOne({ workspace: site.workspace });
  if (!kit) throw notFound("BrandKit not found");
  return toBrandKit(kit);
}
