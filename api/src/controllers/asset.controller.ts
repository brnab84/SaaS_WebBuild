import type { Request, Response } from "express";
import type { PaginationQuery } from "@webforge/shared";
import { userId } from "../middleware/auth.js";
import { createAsset, deleteAsset, listAssets } from "../services/asset.service.js";

export async function uploadAssetHandler(req: Request, res: Response): Promise<void> {
  const asset = await createAsset(req.params.workspaceId!, userId(req), req.file);
  res.status(201).json(asset);
}

export async function listAssetsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PaginationQuery;
  res.json(await listAssets(req.params.workspaceId!, userId(req), query));
}

export async function deleteAssetHandler(req: Request, res: Response): Promise<void> {
  await deleteAsset(req.params.id!, userId(req));
  res.status(204).end();
}
