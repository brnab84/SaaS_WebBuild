import { z } from "zod";
import { blockSchema } from "./blocks.js";
import { brandKitSchema } from "./tokens.js";

/**
 * API contract (DTOs). Request bodies are validated on the API with these exact
 * schemas; the editor app imports them for type-safe fetch calls. One source of
 * truth for both sides.
 */

/* ----------------------------------- auth --------------------------------- */

export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  workspaceName: z.string().min(1).max(120).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro" | "business";
}
export interface WorkspaceDTO {
  id: string;
  name: string;
  slug: string;
}
export interface AuthResponse {
  user: UserDTO;
  workspace: WorkspaceDTO;
  tokens: AuthTokens;
}

/* ----------------------------------- sites -------------------------------- */

export const createSiteSchema = z.object({
  name: z.string().min(1).max(140),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "lowercase letters, numbers and dashes")
    .optional(),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const updateSiteSchema = z
  .object({
    name: z.string().min(1).max(140).optional(),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Empty update");
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;

export interface SiteDTO {
  id: string;
  workspace: string;
  name: string;
  slug: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------------- pages -------------------------------- */

export const createPageSchema = z.object({
  title: z.string().min(1).max(140),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
    .optional(),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

/** Autosave payload — the editor PATCHes the full page tree (debounced 1.5s). */
export const savePageSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  tree: blockSchema,
});
export type SavePageInput = z.infer<typeof savePageSchema>;

export interface PageDTO {
  id: string;
  site: string;
  title: string;
  slug: string;
  tree: z.infer<typeof blockSchema>;
  isHome: boolean;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- assets --------------------------------- */

export interface AssetDTO {
  id: string;
  workspace: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

/* --------------------------------- brandkit ------------------------------- */

export const updateBrandKitSchema = brandKitSchema.partial();
export type UpdateBrandKitInput = z.infer<typeof updateBrandKitSchema>;

/* -------------------------------- pagination ------------------------------ */

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
