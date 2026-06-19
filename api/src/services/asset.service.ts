import type { AssetDTO, Paginated, PaginationQuery } from "@webforge/shared";
import { Asset, type AssetDoc } from "../models/Asset.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { requireWorkspace } from "./access.service.js";
import { storageService } from "./storage/index.js";

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export function toAssetDTO(a: AssetDoc): AssetDTO {
  return {
    id: a._id.toString(),
    workspace: a.workspace.toString(),
    filename: a.filename,
    url: a.url,
    mimeType: a.mimeType,
    size: a.size,
    width: a.width,
    height: a.height,
    createdAt: a.createdAt.toISOString(),
  };
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
}

export async function createAsset(
  workspaceId: string,
  userId: string,
  file: UploadedFile | undefined,
): Promise<AssetDTO> {
  await requireWorkspace(workspaceId, userId);
  if (!file) throw badRequest("No file uploaded (field 'file')");

  // Storage key is opaque to the rest of the app — same key works for R2 later.
  const key = `${workspaceId}/${Date.now()}-${safeName(file.originalname)}`;
  const stored = await storageService.put(key, file.buffer, file.mimetype);

  const asset = await Asset.create({
    workspace: workspaceId,
    filename: file.originalname,
    key,
    url: stored.url,
    mimeType: file.mimetype,
    size: file.size,
    width: null,
    height: null,
  });
  return toAssetDTO(asset);
}

export async function listAssets(
  workspaceId: string,
  userId: string,
  query: PaginationQuery,
): Promise<Paginated<AssetDTO>> {
  await requireWorkspace(workspaceId, userId);
  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Asset.find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Asset.countDocuments({ workspace: workspaceId }),
  ]);
  return {
    items: items.map(toAssetDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function deleteAsset(assetId: string, userId: string): Promise<void> {
  const asset = await Asset.findById(assetId);
  if (!asset) throw notFound("Asset not found");
  await requireWorkspace(asset.workspace.toString(), userId);
  await storageService.remove(asset.key);
  await asset.deleteOne();
}
