import type { Request, Response } from "express";
import type { PaginationQuery } from "@webforge/shared";
import { userId } from "../middleware/auth.js";
import { listSubmissions, submitForm } from "../services/form.service.js";

/** Public form submission for a site. */
export async function submitFormHandler(req: Request, res: Response): Promise<void> {
  const formName = req.params.formName ?? "contact";
  res.status(201).json(await submitForm(req.params.siteId!, formName, req.body));
}

/** Admin: list submissions for a workspace. */
export async function listSubmissionsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PaginationQuery;
  res.json(await listSubmissions(req.params.workspaceId!, userId(req), query));
}
