import type { Request, Response } from "express";
import { userId } from "../middleware/auth.js";
import { me } from "../services/auth.service.js";

/** List the workspaces the current user belongs to. */
export async function listWorkspacesHandler(req: Request, res: Response): Promise<void> {
  const { workspaces } = await me(userId(req));
  res.json({ items: workspaces });
}
