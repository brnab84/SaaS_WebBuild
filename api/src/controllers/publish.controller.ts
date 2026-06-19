import type { Request, Response } from "express";
import { userId } from "../middleware/auth.js";
import {
  publishSite,
  readPublishedPage,
  unpublishSite,
} from "../services/publish.service.js";

export async function publishHandler(req: Request, res: Response): Promise<void> {
  res.json(await publishSite(req.params.id!, userId(req)));
}

export async function unpublishHandler(req: Request, res: Response): Promise<void> {
  res.json(await unpublishSite(req.params.id!, userId(req)));
}

const NOT_FOUND_HTML =
  "<!doctype html><meta charset=utf-8><title>Not published</title>" +
  "<body style='font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0'>" +
  "<div style='text-align:center'><h1 style='font-size:3rem;margin:0'>404</h1>" +
  "<p>This page hasn't been published yet.</p></div>";

/** Public: serve a published page (no auth). Home when pageSlug is omitted. */
export async function servePublishedHandler(req: Request, res: Response): Promise<void> {
  const siteSlug = req.params.siteSlug!;
  const pageSlug = req.params.pageSlug ?? ""; // "" => home (index)
  const html = await readPublishedPage(siteSlug, pageSlug);
  if (!html) {
    res.status(404).type("html").send(NOT_FOUND_HTML);
    return;
  }
  res.type("html").send(html);
}
