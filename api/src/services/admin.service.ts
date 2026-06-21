import bcrypt from "bcryptjs";
import type {
  AdminResetUserPasswordInput,
  AdminSiteRow,
  AdminStats,
  AdminUpdateUserInput,
  AdminUserRow,
  AdminWorkspaceRow,
  Paginated,
  PaginationQuery,
} from "@webforge/shared";
import { Asset } from "../models/Asset.js";
import { BrandKit } from "../models/BrandKit.js";
import { Event } from "../models/Event.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { Order } from "../models/Order.js";
import { Page } from "../models/Page.js";
import { Product } from "../models/Product.js";
import { Site } from "../models/Site.js";
import { User } from "../models/User.js";
import { Workspace } from "../models/Workspace.js";
import { badRequest, notFound } from "../utils/http-error.js";

const BCRYPT_ROUNDS = 12;

function toUserRow(u: {
  _id: { toString(): string };
  name: string;
  email: string;
  plan: string;
  role: AdminUserRow["role"];
  createdAt: Date;
}): AdminUserRow {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    plan: u.plan,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

function paginate<T>(items: T[], total: number, q: PaginationQuery): Paginated<T> {
  return {
    items,
    page: q.page,
    limit: q.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.limit)),
  };
}

/** Platform-wide counts across all tenants. */
export async function getStats(): Promise<AdminStats> {
  const [users, workspaces, sites, pages, products, orders, events, submissions] =
    await Promise.all([
      User.countDocuments(),
      Workspace.countDocuments(),
      Site.countDocuments(),
      Page.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Event.countDocuments(),
      FormSubmission.countDocuments(),
    ]);
  return { users, workspaces, sites, pages, products, orders, events, submissions };
}

export async function listAllUsers(q: PaginationQuery): Promise<Paginated<AdminUserRow>> {
  const [docs, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    User.countDocuments(),
  ]);
  return paginate(docs.map(toUserRow), total, q);
}

export async function listAllWorkspaces(
  q: PaginationQuery,
): Promise<Paginated<AdminWorkspaceRow>> {
  const [docs, total] = await Promise.all([
    Workspace.find()
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate<{ owner: { email?: string } }>("owner", "email"),
    Workspace.countDocuments(),
  ]);

  // Site counts per workspace in one aggregation.
  const ids = docs.map((w) => w._id);
  const counts = await Site.aggregate<{ _id: unknown; n: number }>([
    { $match: { workspace: { $in: ids } } },
    { $group: { _id: "$workspace", n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));

  const items = docs.map((w) => ({
    id: w._id.toString(),
    name: w.name,
    slug: w.slug,
    ownerEmail: w.owner?.email ?? null,
    siteCount: countMap.get(w._id.toString()) ?? 0,
    createdAt: w.createdAt.toISOString(),
  }));
  return paginate(items, total, q);
}

export async function listAllSites(q: PaginationQuery): Promise<Paginated<AdminSiteRow>> {
  const [docs, total] = await Promise.all([
    Site.find()
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Site.countDocuments(),
  ]);
  const items = docs.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    slug: s.slug,
    status: s.status,
    customDomain: s.customDomain ?? null,
    workspace: s.workspace.toString(),
    createdAt: s.createdAt.toISOString(),
  }));
  return paginate(items, total, q);
}

/** Cross-tenant site deletion (moderation). */
export async function deleteAnySite(siteId: string): Promise<void> {
  const site = await Site.findById(siteId);
  if (!site) throw notFound("Site not found");
  await Page.deleteMany({ site: site._id });
  await site.deleteOne();
}

/* ----------------------------- user management ---------------------------- */

/** Change a user's platform role and/or plan. A super-admin can't demote itself. */
export async function updateUser(
  actingUserId: string,
  targetUserId: string,
  input: AdminUpdateUserInput,
): Promise<AdminUserRow> {
  const user = await User.findById(targetUserId);
  if (!user) throw notFound("User not found");

  if (
    input.role === "user" &&
    user.role === "superadmin" &&
    actingUserId === targetUserId
  ) {
    throw badRequest("You can't remove your own super-admin role.");
  }

  if (input.role !== undefined) user.role = input.role;
  if (input.plan !== undefined) user.plan = input.plan;
  await user.save();
  return toUserRow(user);
}

/** Force-set a user's password (e.g. account recovery) and log them out everywhere. */
export async function resetUserPassword(
  targetUserId: string,
  input: AdminResetUserPasswordInput,
): Promise<void> {
  const user = await User.findById(targetUserId);
  if (!user) throw notFound("User not found");
  user.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // invalidate outstanding sessions
  await user.save();
}

/** Delete every tenant resource owned by a workspace, then the workspace itself. */
async function deleteWorkspaceCascade(workspaceId: { toString(): string }): Promise<void> {
  const sites = await Site.find({ workspace: workspaceId }).select("_id");
  const siteIds = sites.map((s) => s._id);
  await Promise.all([
    Page.deleteMany({ site: { $in: siteIds } }),
    Product.deleteMany({ workspace: workspaceId }),
    Order.deleteMany({ workspace: workspaceId }),
    Event.deleteMany({ workspace: workspaceId }),
    FormSubmission.deleteMany({ workspace: workspaceId }),
    Asset.deleteMany({ workspace: workspaceId }),
    BrandKit.deleteMany({ workspace: workspaceId }),
  ]);
  await Site.deleteMany({ workspace: workspaceId });
  await Workspace.deleteOne({ _id: workspaceId });
}

/**
 * Delete a user and everything they own. Workspaces they own are cascade-deleted;
 * they're also removed as a member from any other workspaces. A super-admin can't
 * delete its own account (to avoid locking the platform out).
 */
export async function deleteUser(actingUserId: string, targetUserId: string): Promise<void> {
  if (actingUserId === targetUserId) {
    throw badRequest("You can't delete your own account here.");
  }
  const user = await User.findById(targetUserId);
  if (!user) throw notFound("User not found");

  const owned = await Workspace.find({ owner: user._id }).select("_id");
  for (const ws of owned) await deleteWorkspaceCascade(ws._id);

  // Drop the user from any workspaces where they're a non-owner member.
  await Workspace.updateMany(
    { "members.user": user._id },
    { $pull: { members: { user: user._id } } },
  );

  await user.deleteOne();
}
