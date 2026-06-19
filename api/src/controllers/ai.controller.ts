import type { Request, Response } from "express";
import { userId } from "../middleware/auth.js";
import { generateSite } from "../services/ai/ai.service.js";

/** Phase 2: generate a full site from a business prompt. */
export async function generateSiteHandler(req: Request, res: Response): Promise<void> {
  const site = await generateSite(req.params.workspaceId!, userId(req), req.body);
  res.status(201).json(site);
}
