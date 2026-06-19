import type {
  AdminSiteRow,
  AdminStats,
  AdminUserRow,
  AdminWorkspaceRow,
  Paginated,
  PaginationQuery,
} from "@webforge/shared";
import { Event } from "../models/Event.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { Order } from "../models/Order.js";
import { Page } from "../models/Page.js";
import { Product } from "../models/Product.js";
import { Site } from "../models/Site.js";
import { User } from "../models/User.js";
import { Workspace } from "../models/Workspace.js";
import { notFound } from "../utils/http-error.js";

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
  const items = docs.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    plan: u.plan,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));
  return paginate(items, total, q);
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
