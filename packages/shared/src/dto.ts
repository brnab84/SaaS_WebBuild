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

/** Phase 2 — generate a full site from a business description. */
export const generateSiteSchema = z.object({
  prompt: z.string().min(10).max(4000),
  name: z.string().min(1).max(140).optional(),
});
export type GenerateSiteInput = z.infer<typeof generateSiteSchema>;

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

/**
 * Page update payload. Autosave PATCHes the full `tree` (debounced 1.5s); a
 * rename PATCHes only `title`. At least one field is required.
 */
export const savePageSchema = z
  .object({
    title: z.string().min(1).max(140).optional(),
    tree: blockSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.tree !== undefined, "Nothing to update");
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

/* --------------------------------- products ------------------------------- */

export const createProductSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(0),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "3-letter currency code")
    .default("USD"),
  images: z.array(z.string()).max(8).default([]),
  stock: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
  siteId: z.string().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Empty update");
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export interface ProductDTO {
  id: string;
  workspace: string;
  site: string | null;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  images: string[];
  stock: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------- checkout / orders --------------------------- */

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  customer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
  }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type PaymentProvider = "mock" | "stripe" | "mercadopago";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";

export interface OrderItemDTO {
  product: string;
  title: string;
  priceCents: number;
  quantity: number;
}
export interface OrderDTO {
  id: string;
  workspace: string;
  site: string | null;
  items: OrderItemDTO[];
  totalCents: number;
  currency: string;
  status: OrderStatus;
  provider: PaymentProvider | null;
  customer: { name: string; email: string } | null;
  createdAt: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  orderId: string;
  provider: PaymentProvider;
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
