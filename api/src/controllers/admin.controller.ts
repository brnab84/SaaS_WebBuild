import type { Request, Response } from "express";
import type {
  AdminResetUserPasswordInput,
  AdminUpdateUserInput,
  PaginationQuery,
} from "@webforge/shared";
import { userId } from "../middleware/auth.js";
import {
  deleteAnySite,
  deleteUser,
  getStats,
  listAllSites,
  listAllUsers,
  listAllWorkspaces,
  resetUserPassword,
  updateUser,
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
export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const row = await updateUser(userId(req), req.params.id!, req.body as AdminUpdateUserInput);
  res.json(row);
}
export async function resetUserPasswordHandler(req: Request, res: Response): Promise<void> {
  await resetUserPassword(req.params.id!, req.body as AdminResetUserPasswordInput);
  res.json({ ok: true });
}
export async function deleteUserHandler(req: Request, res: Response): Promise<void> {
  await deleteUser(userId(req), req.params.id!);
  res.status(204).end();
}
