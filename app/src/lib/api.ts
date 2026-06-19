import type {
  AssetDTO,
  AuthResponse,
  BrandKit,
  CreatePageInput,
  CreateSiteInput,
  LoginInput,
  PageDTO,
  Paginated,
  RegisterInput,
  SavePageInput,
  SiteDTO,
  UpdateBrandKitInput,
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
  get: (siteId: string) => request<SiteDTO>(`/api/sites/${siteId}`),
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
