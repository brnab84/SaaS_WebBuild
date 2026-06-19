import type { Request, Response } from "express";
import type { PaginationQuery } from "@webforge/shared";
import { userId } from "../middleware/auth.js";
import {
  createSite,
  deleteSite,
  getSite,
  listSites,
  updateSite,
} from "../services/site.service.js";

export async function createSiteHandler(req: Request, res: Response): Promise<void> {
  const site = await createSite(req.params.workspaceId!, userId(req), req.body);
  res.status(201).json(site);
}

export async function listSitesHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PaginationQuery;
  const workspaceId = req.params.workspaceId;
  res.json(await listSites(userId(req), { ...query, workspaceId }));
}

export async function getSiteHandler(req: Request, res: Response): Promise<void> {
  res.json(await getSite(req.params.id!, userId(req)));
}

export async function updateSiteHandler(req: Request, res: Response): Promise<void> {
  res.json(await updateSite(req.params.id!, userId(req), req.body));
}

export async function deleteSiteHandler(req: Request, res: Response): Promise<void> {
  await deleteSite(req.params.id!, userId(req));
  res.status(204).end();
}
