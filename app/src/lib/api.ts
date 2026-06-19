import type {
  AdminSiteRow,
  AdminStats,
  AdminUserRow,
  AdminWorkspaceRow,
  AssetDTO,
  AuthResponse,
  BrandKit,
  CheckoutInput,
  CheckoutResponse,
  CreateEventInput,
  CreatePageInput,
  CreateProductInput,
  CreateSiteInput,
  EventDTO,
  FormSubmissionDTO,
  FormSubmitInput,
  GenerateSiteInput,
  LoginInput,
  OrderDTO,
  PageDTO,
  Paginated,
  ProductDTO,
  RegisterInput,
  RsvpInput,
  SavePageInput,
  SiteDTO,
  UpdateBrandKitInput,
  UpdateEventInput,
  UpdateProductInput,
  UpdateSiteInput,
} from "@webforge/shared";
import { useAuthStore } from "../store/auth.js";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const BASE = ""; // same-origin / Vite proxy

let refreshing: Promise<boolean> | null = null;

/** Attempt a one-shot token refresh; returns true on success. */
async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return false;
  // De-dupe concurrent refreshes.
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        logout();
        return false;
      }
      const data: AuthResponse = await res.json();
      setTokens(data.tokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; retry?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, retry = true } = options;
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && (await tryRefresh())) {
    return request<T>(path, { ...options, retry: false });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  }
  return data as T;
}

/* --------------------------------- auth ----------------------------------- */
export const authApi = {
  register: (input: RegisterInput) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: input }),
  login: (input: LoginInput) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: input }),
};

/* --------------------------------- sites ---------------------------------- */
export const siteApi = {
  list: (workspaceId: string, page = 1) =>
    request<Paginated<SiteDTO>>(`/api/workspaces/${workspaceId}/sites?page=${page}`),
  create: (workspaceId: string, input: CreateSiteInput) =>
    request<SiteDTO>(`/api/workspaces/${workspaceId}/sites`, { method: "POST", body: input }),
  generate: (workspaceId: string, input: GenerateSiteInput) =>
    request<SiteDTO>(`/api/workspaces/${workspaceId}/generate-site`, {
      method: "POST",
      body: input,
    }),
  get: (siteId: string) => request<SiteDTO>(`/api/sites/${siteId}`),
  update: (siteId: string, input: UpdateSiteInput) =>
    request<SiteDTO>(`/api/sites/${siteId}`, { method: "PATCH", body: input }),
  remove: (siteId: string) => request<void>(`/api/sites/${siteId}`, { method: "DELETE" }),
  publish: (siteId: string) =>
    request<{ url: string; pages: number; site: SiteDTO }>(`/api/sites/${siteId}/publish`, {
      method: "POST",
    }),
  unpublish: (siteId: string) =>
    request<SiteDTO>(`/api/sites/${siteId}/unpublish`, { method: "POST" }),
  brandKit: (siteId: string) => request<BrandKit>(`/api/sites/${siteId}/brandkit`),
};

/* --------------------------------- pages ---------------------------------- */
export const pageApi = {
  listForSite: (siteId: string) => request<PageDTO[]>(`/api/sites/${siteId}/pages`),
  create: (siteId: string, input: CreatePageInput) =>
    request<PageDTO>(`/api/sites/${siteId}/pages`, { method: "POST", body: input }),
  get: (pageId: string) => request<PageDTO>(`/api/pages/${pageId}`),
  save: (pageId: string, input: SavePageInput) =>
    request<PageDTO>(`/api/pages/${pageId}`, { method: "PATCH", body: input }),
  remove: (pageId: string) => request<void>(`/api/pages/${pageId}`, { method: "DELETE" }),
};

/* ------------------------------- products --------------------------------- */
export const productApi = {
  list: (workspaceId: string, page = 1) =>
    request<Paginated<ProductDTO>>(`/api/workspaces/${workspaceId}/products?page=${page}&limit=100`),
  create: (workspaceId: string, input: CreateProductInput) =>
    request<ProductDTO>(`/api/workspaces/${workspaceId}/products`, { method: "POST", body: input }),
  update: (productId: string, input: UpdateProductInput) =>
    request<ProductDTO>(`/api/products/${productId}`, { method: "PATCH", body: input }),
  remove: (productId: string) => request<void>(`/api/products/${productId}`, { method: "DELETE" }),
};

/* -------------------------------- orders ---------------------------------- */
export const orderApi = {
  list: (workspaceId: string, page = 1) =>
    request<Paginated<OrderDTO>>(`/api/workspaces/${workspaceId}/orders?page=${page}`),
};

/* -------------------------------- events ---------------------------------- */
export const eventApi = {
  list: (workspaceId: string, page = 1) =>
    request<Paginated<EventDTO>>(`/api/workspaces/${workspaceId}/events?page=${page}&limit=100`),
  create: (workspaceId: string, input: CreateEventInput) =>
    request<EventDTO>(`/api/workspaces/${workspaceId}/events`, { method: "POST", body: input }),
  get: (eventId: string) => request<EventDTO>(`/api/events/${eventId}`),
  update: (eventId: string, input: UpdateEventInput) =>
    request<EventDTO>(`/api/events/${eventId}`, { method: "PATCH", body: input }),
  remove: (eventId: string) => request<void>(`/api/events/${eventId}`, { method: "DELETE" }),
};

/* ----------------------------- submissions -------------------------------- */
export const submissionApi = {
  list: (workspaceId: string, page = 1) =>
    request<Paginated<FormSubmissionDTO>>(
      `/api/workspaces/${workspaceId}/submissions?page=${page}`,
    ),
};

/* ------------------------------ storefront -------------------------------- */
export const storefrontApi = {
  // Public endpoints — no auth needed (request() just attaches a token if present).
  checkout: (siteId: string, input: CheckoutInput) =>
    request<CheckoutResponse>(`/api/storefront/${siteId}/checkout`, { method: "POST", body: input }),
  rsvp: (eventId: string, input: RsvpInput) =>
    request<{ spotsLeft: number | null; status: string }>(
      `/api/storefront/events/${eventId}/rsvp`,
      { method: "POST", body: input },
    ),
  submitForm: (siteId: string, formName: string, input: FormSubmitInput) =>
    request<{ ok: boolean }>(`/api/storefront/${siteId}/forms/${formName}`, {
      method: "POST",
      body: input,
    }),
};

/* -------------------------------- admin ----------------------------------- */
export const adminApi = {
  stats: () => request<AdminStats>("/api/admin/stats"),
  users: (page = 1) => request<Paginated<AdminUserRow>>(`/api/admin/users?page=${page}&limit=100`),
  workspaces: (page = 1) =>
    request<Paginated<AdminWorkspaceRow>>(`/api/admin/workspaces?page=${page}&limit=100`),
  sites: (page = 1) => request<Paginated<AdminSiteRow>>(`/api/admin/sites?page=${page}&limit=100`),
  deleteSite: (id: string) => request<void>(`/api/admin/sites/${id}`, { method: "DELETE" }),
};

/* ------------------------------- brandkit --------------------------------- */
export const brandKitApi = {
  get: (workspaceId: string) => request<BrandKit>(`/api/workspaces/${workspaceId}/brandkit`),
  update: (workspaceId: string, patch: UpdateBrandKitInput) =>
    request<BrandKit>(`/api/workspaces/${workspaceId}/brandkit`, {
      method: "PATCH",
      body: patch,
    }),
};

/**
 * Upload an image asset (multipart). Uses FormData, so we don't set
 * content-type (the browser adds the boundary). Retries once after refresh.
 */
export async function uploadAsset(workspaceId: string, file: File): Promise<AssetDTO> {
  const form = new FormData();
  form.append("file", file);
  const path = `/api/workspaces/${workspaceId}/assets`;
  const send = () => {
    const token = useAuthStore.getState().accessToken;
    return fetch(`${BASE}${path}`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Upload failed", data?.details);
  return data as AssetDTO;
}

/** Download the site's static export as a Blob (authorized). */
export async function exportSite(siteId: string): Promise<Blob> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${BASE}/api/sites/${siteId}/export`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Export failed");
  return res.blob();
}

/**
 * Fetch rendered preview HTML with auth (the iframe can't send headers, so we
 * fetch the string and inject it via srcDoc).
 */
export async function fetchPreviewHtml(pageId: string): Promise<string> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${BASE}/api/pages/${pageId}/preview`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return res.ok ? res.text() : "<p style='font-family:sans-serif;padding:2rem'>Preview unavailable</p>";
}
