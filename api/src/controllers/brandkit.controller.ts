import type { Request, Response } from "express";
import { userId } from "../middleware/auth.js";
import {
  getSiteBrandKit,
  getWorkspaceBrandKit,
  updateWorkspaceBrandKit,
} from "../services/brandkit.service.js";

export async function getBrandKitHandler(req: Request, res: Response): Promise<void> {
  res.json(await getWorkspaceBrandKit(req.params.workspaceId!, userId(req)));
}

export async function updateBrandKitHandler(req: Request, res: Response): Promise<void> {
  res.json(await updateWorkspaceBrandKit(req.params.workspaceId!, userId(req), req.body));
}

/** Convenience: read a BrandKit by site (resolves the owning workspace). */
export async function getSiteBrandKitHandler(req: Request, res: Response): Promise<void> {
  res.json(await getSiteBrandKit(req.params.id!, userId(req)));
}
