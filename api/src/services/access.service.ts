import type { HydratedDocument, Types } from "mongoose";
import { Workspace, type WorkspaceDoc } from "../models/Workspace.js";
import { Site, type SiteDoc } from "../models/Site.js";
import { forbidden, notFound } from "../utils/http-error.js";

/** Resolve a workspace the user is a member of, or throw 403/404. */
export async function requireWorkspace(
  workspaceId: string,
  userId: string,
): Promise<HydratedDocument<WorkspaceDoc>> {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw notFound("Workspace not found");
  const isMember = ws.members.some((m) => m.user.toString() === userId);
  if (!isMember) throw forbidden("Not a member of this workspace");
  return ws;
}

/** All workspace ids the user can access (for scoped listings). */
export async function accessibleWorkspaceIds(userId: string): Promise<Types.ObjectId[]> {
  const workspaces = await Workspace.find({ "members.user": userId }).select("_id");
  return workspaces.map((w) => w._id);
}

/** Resolve a site the user can access (via workspace membership), or throw. */
export async function requireSite(
  siteId: string,
  userId: string,
): Promise<HydratedDocument<SiteDoc>> {
  const site = await Site.findById(siteId);
  if (!site) throw notFound("Site not found");
  await requireWorkspace(site.workspace.toString(), userId);
  return site;
}
