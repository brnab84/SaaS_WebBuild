import type { Request, Response } from "express";
import { userId } from "../middleware/auth.js";
import { exportSiteZip } from "../services/export.service.js";

/** Download a ZIP of the site's static HTML/CSS export. */
export async function exportSiteHandler(req: Request, res: Response): Promise<void> {
  const { buffer, filename } = await exportSiteZip(req.params.id!, userId(req));
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}
