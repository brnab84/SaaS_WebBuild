import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { PageDTO } from "@webforge/shared";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./db/connect.js";

let mongo: MongoMemoryServer;
let server: Server;
let baseUrl: string;

// Shared state threaded through the sequential flow.
const state: {
  accessToken: string;
  workspaceId: string;
  siteId: string;
  siteSlug: string;
  homePageId: string;
} = { accessToken: "", workspaceId: "", siteId: "", siteSlug: "", homePageId: "" };

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
  const port = typeof addr === "object" && addr ? addr.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
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
});
