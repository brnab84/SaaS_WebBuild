import type { Request, Response } from "express";
import { userId } from "../middleware/auth.js";
import {
  createPage,
  deletePage,
  getPage,
  listPages,
  savePage,
} from "../services/page.service.js";
import { renderPagePreview } from "../services/render.service.js";

export async function listPagesHandler(req: Request, res: Response): Promise<void> {
  res.json(await listPages(req.params.id!, userId(req)));
}

export async function createPageHandler(req: Request, res: Response): Promise<void> {
  res.status(201).json(await createPage(req.params.id!, userId(req), req.body));
}

export async function getPageHandler(req: Request, res: Response): Promise<void> {
  res.json(await getPage(req.params.id!, userId(req)));
}

/** Autosave: editor PATCHes the validated full block tree (debounced 1.5s). */
export async function savePageHandler(req: Request, res: Response): Promise<void> {
  res.json(await savePage(req.params.id!, userId(req), req.body));
}

export async function deletePageHandler(req: Request, res: Response): Promise<void> {
  await deletePage(req.params.id!, userId(req));
  res.status(204).end();
}

/** Live draft preview HTML for the editor iframe. */
export async function previewPageHandler(req: Request, res: Response): Promise<void> {
  const html = await renderPagePreview(req.params.id!, userId(req));
  res.type("html").send(html);
}
