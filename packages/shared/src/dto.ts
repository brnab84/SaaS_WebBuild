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
export type UserRole = "user" | "superadmin";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro" | "business";
  role: UserRole;
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
    // Phase 5 — custom domain (null clears it).
    customDomain: z
      .string()
      .regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i, "Invalid domain")
      .max(253)
      .nullable()
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
  customDomain: string | null;
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

/* --------------------------------- events --------------------------------- */

export const createEventSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  location: z.string().max(300).optional(),
  capacity: z.number().int().min(1).nullable().optional(),
  siteId: z.string().optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Empty update");
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export type RsvpStatus = "going" | "maybe" | "declined";

export const rsvpSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  guests: z.number().int().min(1).max(20).default(1),
  status: z.enum(["going", "maybe", "declined"]).default("going"),
});
export type RsvpInput = z.infer<typeof rsvpSchema>;

export interface RsvpDTO {
  name: string;
  email: string;
  guests: number;
  status: RsvpStatus;
  createdAt: string;
}

export interface EventDTO {
  id: string;
  workspace: string;
  site: string | null;
  title: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  capacity: number | null;
  rsvps: RsvpDTO[];
  goingCount: number;
  spotsLeft: number | null;
  createdAt: string;
}

/* -------------------------------- form submissions ------------------------ */

export const formSubmitSchema = z
  .object({
    name: z.string().max(160).optional(),
    email: z.string().email().optional(),
    message: z.string().max(5000).optional(),
    fields: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (v) => Boolean(v.name || v.email || v.message || (v.fields && Object.keys(v.fields).length)),
    "Submission is empty",
  );
export type FormSubmitInput = z.infer<typeof formSubmitSchema>;

export interface FormSubmissionDTO {
  id: string;
  workspace: string;
  site: string | null;
  formName: string;
  name: string | null;
  email: string | null;
  message: string | null;
  fields: Record<string, string>;
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

/* ----------------------------- platform admin ----------------------------- */

export interface AdminStats {
  users: number;
  workspaces: number;
  sites: number;
  pages: number;
  products: number;
  orders: number;
  events: number;
  submissions: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: UserRole;
  createdAt: string;
}

export interface AdminWorkspaceRow {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string | null;
  siteCount: number;
  createdAt: string;
}

export interface AdminSiteRow {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published";
  customDomain: string | null;
  workspace: string;
  createdAt: string;
}
