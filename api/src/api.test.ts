import http, { type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { PageDTO } from "@webforge/shared";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./db/connect.js";
import { User } from "./models/User.js";
import { signResetToken } from "./services/token.service.js";

let mongo: MongoMemoryServer;
let server: Server;
let baseUrl: string;
let serverPort = 0;

/** Raw GET with a custom Host header (fetch forbids setting Host). */
function rawGet(path: string, host: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: serverPort, path, method: "GET", headers: { Host: host } },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

// Shared state threaded through the sequential flow.
const state: {
  accessToken: string;
  userId: string;
  workspaceId: string;
  siteId: string;
  siteSlug: string;
  homePageId: string;
} = { accessToken: "", userId: "", workspaceId: "", siteId: "", siteSlug: "", homePageId: "" };

// Phase 3 e-commerce state threaded through its tests.
const ecom = { productId: "", orderId: "" };
// Phase 4 events state.
const ev = { eventId: "" };

async function api(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (state.accessToken) headers.authorization = `Bearer ${state.accessToken}`;
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

// undici's Response.json() returns `unknown`; this keeps assertions ergonomic.
const json = <T = Record<string, any>>(res: Response): Promise<T> => res.json() as Promise<T>;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  serverPort = typeof addr === "object" && addr ? addr.port : 0;
  baseUrl = `http://127.0.0.1:${serverPort}`;
}, 120_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  await disconnectDB();
  await mongo?.stop();
});

describe("WebForge API end-to-end (Phase 1)", () => {
  it("reports health", async () => {
    const res = await api("/api/health");
    expect(res.status).toBe(200);
    expect((await json(res)).status).toBe("ok");
  });

  it("registers a user and provisions a workspace + brandkit", async () => {
    const res = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Ada",
        email: "ada@example.com",
        password: "supersecret",
        workspaceName: "Ada Studio",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.tokens.accessToken).toBeTruthy();
    expect(body.workspace.slug).toBe("ada-studio");
    state.accessToken = body.tokens.accessToken;
    state.userId = body.user.id;
    state.workspaceId = body.workspace.id;
  });

  it("rejects duplicate registration", async () => {
    const res = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Ada", email: "ada@example.com", password: "supersecret" }),
    });
    expect(res.status).toBe(409);
  });

  it("rejects an unauthenticated request", async () => {
    const token = state.accessToken;
    state.accessToken = "";
    const res = await api("/api/sites");
    state.accessToken = token;
    expect(res.status).toBe(401);
  });

  it("creates a site with a starter home page", async () => {
    const res = await api(`/api/workspaces/${state.workspaceId}/sites`, {
      method: "POST",
      body: JSON.stringify({ name: "My Launch" }),
    });
    expect(res.status).toBe(201);
    const site = await json(res);
    expect(site.status).toBe("draft");
    state.siteId = site.id;
    state.siteSlug = site.slug;

    const pagesRes = await api(`/api/sites/${state.siteId}/pages`);
    const pages = await json<PageDTO[]>(pagesRes);
    expect(pages.length).toBe(1);
    expect(pages[0]!.isHome).toBe(true);
    state.homePageId = pages[0]!.id;
  });

  it("autosaves an edited block tree", async () => {
    const pageRes = await api(`/api/pages/${state.homePageId}`);
    const page = await json<PageDTO>(pageRes);
    // Edit the hero title inside the starter tree.
    const tree = page.tree as { children: { type: string; props: Record<string, unknown> }[] };
    const hero = tree.children.find((c) => c.type === "hero");
    expect(hero).toBeTruthy();
    hero!.props.title = "Hello QA";

    const res = await api(`/api/pages/${state.homePageId}`, {
      method: "PATCH",
      body: JSON.stringify({ tree: page.tree }),
    });
    expect(res.status).toBe(200);
    const saved = await json<PageDTO>(res);
    const savedTree = saved.tree as { children: { type: string; props: { title?: string } }[] };
    expect(savedTree.children.find((c) => c.type === "hero")!.props.title).toBe("Hello QA");
  });

  it("rejects an invalid block tree on autosave", async () => {
    const res = await api(`/api/pages/${state.homePageId}`, {
      method: "PATCH",
      body: JSON.stringify({ tree: { id: "x", type: "not-a-block", props: {}, children: [] } }),
    });
    expect(res.status).toBe(400);
  });

  it("renders a live draft preview containing the edit", async () => {
    const res = await api(`/api/pages/${state.homePageId}/preview`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Hello QA");
  });

  it("publishes the site and serves it publicly", async () => {
    const res = await api(`/api/sites/${state.siteId}/publish`, { method: "POST" });
    expect(res.status).toBe(200);
    const result = await json(res);
    expect(result.pages).toBeGreaterThanOrEqual(1);
    expect(result.site.status).toBe("published");

    const served = await fetch(`${baseUrl}/s/${state.siteSlug}`);
    expect(served.status).toBe(200);
    expect(await served.text()).toContain("Hello QA");
  });

  it("unpublishes the site (public serving returns 404)", async () => {
    const res = await api(`/api/sites/${state.siteId}/unpublish`, { method: "POST" });
    expect(res.status).toBe(200);
    expect((await json(res)).status).toBe("draft");

    const served = await fetch(`${baseUrl}/s/${state.siteSlug}`);
    expect(served.status).toBe(404);
  });

  it("uploads an image asset and serves it via StorageService", async () => {
    // A minimal valid 1x1 transparent PNG.
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
        "0000000d49444154789c6360000002000100ffff03000006000557bfabd4" +
        "0000000049454e44ae426082",
      "hex",
    );
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "pixel.png");
    const res = await fetch(`${baseUrl}/api/workspaces/${state.workspaceId}/assets`, {
      method: "POST",
      headers: { authorization: `Bearer ${state.accessToken}` },
      body: form,
    });
    expect(res.status).toBe(201);
    const asset = await json(res);
    expect(asset.url).toContain("/uploads/");
    expect(asset.mimeType).toBe("image/png");

    const served = await fetch(`${baseUrl}${new URL(asset.url).pathname}`);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toContain("image/png");
  });

  it("rejects a non-image upload", async () => {
    const form = new FormData();
    form.append("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");
    const res = await fetch(`${baseUrl}/api/workspaces/${state.workspaceId}/assets`, {
      method: "POST",
      headers: { authorization: `Bearer ${state.accessToken}` },
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it("creates, renames (title only) and deletes a secondary page; home is protected", async () => {
    const created = await json<PageDTO>(
      await api(`/api/sites/${state.siteId}/pages`, {
        method: "POST",
        body: JSON.stringify({ title: "About" }),
      }),
    );
    expect(created.title).toBe("About");
    expect(created.isHome).toBe(false);

    // Rename with title only (no tree) — exercises the optional-tree PATCH path.
    const renamed = await json<PageDTO>(
      await api(`/api/pages/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "About us" }),
      }),
    );
    expect(renamed.title).toBe("About us");

    const del = await api(`/api/pages/${created.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    // The home page cannot be deleted.
    const delHome = await api(`/api/pages/${state.homePageId}`, { method: "DELETE" });
    expect(delHome.status).toBe(403);
  });

  it("returns 501 for AI generation when no API key is configured", async () => {
    // The test env has no ANTHROPIC_API_KEY — the endpoint should degrade gracefully.
    const res = await api(`/api/workspaces/${state.workspaceId}/generate-site`, {
      method: "POST",
      body: JSON.stringify({ prompt: "A cozy neighbourhood bookstore with events." }),
    });
    expect(res.status).toBe(501);
    expect((await json(res)).error).toMatch(/ANTHROPIC_API_KEY/);
  });

  /* ----------------------- Phase 3: e-commerce ------------------------ */

  it("creates, lists and updates products", async () => {
    const created = await json<{ id: string; slug: string; priceCents: number; active: boolean }>(
      await api(`/api/workspaces/${state.workspaceId}/products`, {
        method: "POST",
        body: JSON.stringify({ title: "Signed paperback", priceCents: 2500, currency: "USD" }),
      }),
    );
    expect(created.priceCents).toBe(2500);
    expect(created.slug).toBe("signed-paperback");
    ecom.productId = created.id;

    const list = await json<{ items: { id: string }[]; total: number }>(
      await api(`/api/workspaces/${state.workspaceId}/products`),
    );
    expect(list.items.some((p) => p.id === ecom.productId)).toBe(true);

    const updated = await json<{ priceCents: number }>(
      await api(`/api/products/${ecom.productId}`, {
        method: "PATCH",
        body: JSON.stringify({ priceCents: 3000 }),
      }),
    );
    expect(updated.priceCents).toBe(3000);
  });

  it("runs a public checkout through the mock provider and marks the order paid", async () => {
    // Checkout is public; the buyer sends only product ids + quantities.
    const checkout = await json<{ checkoutUrl: string; orderId: string; provider: string }>(
      await fetch(`${baseUrl}/api/storefront/${state.siteId}/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: ecom.productId, quantity: 2 }],
          customer: { name: "Buyer One", email: "buyer@example.com" },
        }),
      }),
    );
    expect(checkout.provider).toBe("mock");
    expect(checkout.checkoutUrl).toContain(`/checkout/mock/${checkout.orderId}`);
    ecom.orderId = checkout.orderId;

    // Price is computed server-side: 3000 (updated) * 2.
    const before = await json<{ status: string; totalCents: number }>(
      await fetch(`${baseUrl}/api/storefront/orders/${ecom.orderId}`),
    );
    expect(before.status).toBe("pending");
    expect(before.totalCents).toBe(6000);

    // The hosted mock checkout page renders.
    const pageRes = await fetch(`${baseUrl}/checkout/mock/${ecom.orderId}`);
    expect(pageRes.status).toBe(200);
    expect(await pageRes.text()).toContain("Test checkout");

    // Confirm payment (stands in for the provider callback).
    const confirm = await fetch(`${baseUrl}/api/storefront/mock/${ecom.orderId}/confirm`, {
      method: "POST",
    });
    expect(confirm.status).toBe(200);

    const after = await json<{ status: string }>(
      await fetch(`${baseUrl}/api/storefront/orders/${ecom.orderId}`),
    );
    expect(after.status).toBe("paid");
  });

  it("rejects checkout referencing an unknown product", async () => {
    const res = await fetch(`${baseUrl}/api/storefront/${state.siteId}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: "60a000000000000000000000", quantity: 1 }],
        customer: { name: "X", email: "x@example.com" },
      }),
    });
    expect(res.status).toBe(400);
  });

  it("lists the workspace orders (admin) including the paid one", async () => {
    const list = await json<{ items: { id: string; status: string }[] }>(
      await api(`/api/workspaces/${state.workspaceId}/orders`),
    );
    expect(list.items.find((o) => o.id === ecom.orderId)?.status).toBe("paid");
  });

  /* ------------------------- Phase 4: events + forms ------------------- */

  it("creates and updates an event with a capacity", async () => {
    const created = await json<{ id: string; slug: string; capacity: number }>(
      await api(`/api/workspaces/${state.workspaceId}/events`, {
        method: "POST",
        body: JSON.stringify({
          title: "Launch Party",
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          capacity: 2,
          location: "HQ",
        }),
      }),
    );
    expect(created.slug).toBe("launch-party");
    expect(created.capacity).toBe(2);
    ev.eventId = created.id;

    const updated = await json<{ location: string }>(
      await api(`/api/events/${ev.eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ location: "Rooftop" }),
      }),
    );
    expect(updated.location).toBe("Rooftop");
  });

  it("accepts a public RSVP and enforces capacity", async () => {
    // First RSVP takes both spots.
    const first = await json<{ spotsLeft: number }>(
      await fetch(`${baseUrl}/api/storefront/events/${ev.eventId}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ada", email: "ada@example.com", guests: 2, status: "going" }),
      }),
    );
    expect(first.spotsLeft).toBe(0);

    // A second going RSVP overflows capacity -> 400.
    const overflow = await fetch(`${baseUrl}/api/storefront/events/${ev.eventId}/rsvp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bob", email: "bob@example.com", guests: 1, status: "going" }),
    });
    expect(overflow.status).toBe(400);

    // Admin sees the RSVP and the going count.
    const event = await json<{ goingCount: number; rsvps: { email: string }[] }>(
      await api(`/api/events/${ev.eventId}`),
    );
    expect(event.goingCount).toBe(2);
    expect(event.rsvps.some((r) => r.email === "ada@example.com")).toBe(true);
  });

  it("captures and lists a public form submission", async () => {
    const submit = await fetch(`${baseUrl}/api/storefront/${state.siteId}/forms/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Carol", email: "carol@example.com", message: "Hi there!" }),
    });
    expect(submit.status).toBe(201);

    const list = await json<{ items: { email: string; formName: string }[] }>(
      await api(`/api/workspaces/${state.workspaceId}/submissions`),
    );
    expect(list.items.some((s) => s.email === "carol@example.com" && s.formName === "contact")).toBe(
      true,
    );
  });

  it("deletes an event", async () => {
    const res = await api(`/api/events/${ev.eventId}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  /* ------------------- Phase 5: export + custom domains ----------------- */

  it("allows multiple sites without a custom domain (no null-index collision)", async () => {
    const second = await api(`/api/workspaces/${state.workspaceId}/sites`, {
      method: "POST",
      body: JSON.stringify({ name: "Second Site" }),
    });
    expect(second.status).toBe(201);
    const third = await api(`/api/workspaces/${state.workspaceId}/sites`, {
      method: "POST",
      body: JSON.stringify({ name: "Third Site" }),
    });
    expect(third.status).toBe(201);
  });

  it("exports the site as a static HTML ZIP", async () => {
    const res = await api(`/api/sites/${state.siteId}/export`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/zip");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK"); // ZIP magic bytes
    expect(buf.byteLength).toBeGreaterThan(100);
  });

  it("serves a published site by its custom domain (Host header)", async () => {
    // Re-publish (an earlier test unpublished it) and attach a custom domain.
    await api(`/api/sites/${state.siteId}/publish`, { method: "POST" });
    const patched = await json<{ customDomain: string }>(
      await api(`/api/sites/${state.siteId}`, {
        method: "PATCH",
        body: JSON.stringify({ customDomain: "shop.example.com" }),
      }),
    );
    expect(patched.customDomain).toBe("shop.example.com");

    const served = await rawGet("/", "shop.example.com");
    expect(served.status).toBe(200);
    expect(served.body).toContain("Hello QA"); // the home page edited earlier

    // An unknown domain falls through to the normal app (not the site).
    const unknown = await rawGet("/", "nobody.example.com");
    expect(unknown.body).not.toContain("Hello QA");
  });

  /* ------------------------ Platform admin (owner) --------------------- */

  it("denies the admin API to a normal user", async () => {
    const res = await api("/api/admin/stats");
    expect(res.status).toBe(403);
  });

  it("grants the admin API to a super-admin (cross-tenant view)", async () => {
    // Promote the current user (registered as ada@example.com) to super-admin.
    await User.updateOne({ email: "ada@example.com" }, { role: "superadmin" });

    const stats = await json<{ users: number; sites: number; workspaces: number }>(
      await api("/api/admin/stats"),
    );
    expect(stats.users).toBeGreaterThanOrEqual(1);
    expect(stats.workspaces).toBeGreaterThanOrEqual(1);

    const users = await json<{ items: { email: string; role: string }[] }>(
      await api("/api/admin/users"),
    );
    expect(users.items.some((u) => u.email === "ada@example.com" && u.role === "superadmin")).toBe(
      true,
    );

    const sites = await json<{ items: { slug: string }[] }>(await api("/api/admin/sites"));
    expect(sites.items.some((s) => s.slug === state.siteSlug)).toBe(true);
  });

  it("manages users: role, plan, password reset and deletion", async () => {
    // A second tenant for the super-admin to manage.
    const reg = await json<{ user: { id: string } }>(
      await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bob", email: "bob@example.com", password: "bobsecret1" }),
      }),
    );
    const bobId = reg.user.id;

    // Promote + change plan.
    const promoted = await json<{ role: string; plan: string }>(
      await api(`/api/admin/users/${bobId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "superadmin", plan: "pro" }),
      }),
    );
    expect(promoted.role).toBe("superadmin");
    expect(promoted.plan).toBe("pro");

    // Admin can't demote itself.
    const self = await api(`/api/admin/users/${state.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: "user" }),
    });
    expect(self.status).toBe(400);

    // Force-reset Bob's password; the new one logs in.
    const reset = await api(`/api/admin/users/${bobId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword: "forcedpass1" }),
    });
    expect(reset.status).toBe(200);
    const bobLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "bob@example.com", password: "forcedpass1" }),
    });
    expect(bobLogin.status).toBe(200);

    // Delete Bob (and his workspace cascade).
    const del = await api(`/api/admin/users/${bobId}`, { method: "DELETE" });
    expect(del.status).toBe(204);
    expect(await User.findById(bobId)).toBeNull();

    // Admin can't delete itself.
    const selfDel = await api(`/api/admin/users/${state.userId}`, { method: "DELETE" });
    expect(selfDel.status).toBe(400);
  });

  /* --------------------------- password flows -------------------------- */

  it("changes the password (wrong current -> 401, then new one works)", async () => {
    const wrong = await api("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "WRONG", newPassword: "newpassword123" }),
    });
    expect(wrong.status).toBe(401);

    const ok = await api("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "supersecret", newPassword: "newpassword123" }),
    });
    expect(ok.status).toBe(200);

    const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com", password: "supersecret" }),
    });
    expect(oldLogin.status).toBe(401);
    const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com", password: "newpassword123" }),
    });
    expect(newLogin.status).toBe(200);
  });

  it("forgot-password never reveals existence; reset rejects a bad token", async () => {
    for (const email of ["ada@example.com", "nobody@example.com"]) {
      const r = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      expect(r.status).toBe(200);
    }
    const bad = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "not-a-real-token-aaaaaaaaaa", newPassword: "whatever123" }),
    });
    expect(bad.status).toBe(400);
  });

  it("resets the password with a valid token", async () => {
    const user = await User.findOne({ email: "ada@example.com" });
    const token = signResetToken(user!._id.toString(), user!.tokenVersion);
    const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword: "resetpass123" }),
    });
    expect(res.status).toBe(200);
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com", password: "resetpass123" }),
    });
    expect(login.status).toBe(200);
  });
});
