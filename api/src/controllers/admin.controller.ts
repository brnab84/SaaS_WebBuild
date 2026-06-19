import type { Request, Response } from "express";
import type { PaginationQuery } from "@webforge/shared";
import {
  deleteAnySite,
  getStats,
  listAllSites,
  listAllUsers,
  listAllWorkspaces,
} from "../services/admin.service.js";

const query = (req: Request) => req.query as unknown as PaginationQuery;

export async function statsHandler(_req: Request, res: Response): Promise<void> {
  res.json(await getStats());
}
export async function usersHandler(req: Request, res: Response): Promise<void> {
  res.json(await listAllUsers(query(req)));
}
export async function workspacesHandler(req: Request, res: Response): Promise<void> {
  res.json(await listAllWorkspaces(query(req)));
}
export async function sitesHandler(req: Request, res: Response): Promise<void> {
  res.json(await listAllSites(query(req)));
}
export async function deleteSiteHandler(req: Request, res: Response): Promise<void> {
  await deleteAnySite(req.params.id!);
  res.status(204).end();
}
