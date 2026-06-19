# WebForge

**AI-first, all-in-one website builder (multi-tenant SaaS).** Users with no technical
background create fully customizable sites (landing pages, stores, events, blogs,
portfolios) through a visual drag-and-drop editor, with a central Brand Kit of design
tokens that propagates across the whole site.

> Status: **Phase 1 (MVP)** — functional and deployable on Railway Hobby. The editor,
> Brand Kit, autosave, JSON→HTML renderer, responsive preview, and abstracted
> publish/storage layers all work end-to-end.

---

## Why WebForge

1. **AI-first** — generate a full site (structure + copy + palette + type) from a
   business prompt, not rigid templates. _(Implemented — needs `ANTHROPIC_API_KEY`.)_
2. **Visual editing without cages** — Webflow-like control with Wix-like simplicity.
3. **Real code export, no lock-in** _(Phase 5)_ — the renderer already emits clean,
   self-contained static HTML/CSS.
4. **Central Brand Kit with design tokens** — change one color/font and it propagates
   everywhere via CSS custom properties.
5. **Composable, reusable blocks.**
6. **Performance** — static render, sub-second pages.

---

## Architecture

A TypeScript **monorepo** (npm workspaces, ESM everywhere, run via `tsx`/Vite — no
build step for the backend).

```
webforge/
├── packages/shared/   @webforge/shared    zod schemas: blocks, design tokens, DTOs
├── renderer/          @webforge/renderer   pure engine: block JSON tree → HTML + CSS
├── api/               @webforge/api        Express + MongoDB backend (REST)
└── app/               @webforge/app        React + Vite drag-and-drop editor
```

### The block engine (core)

Every page is a serializable JSON tree. Each node has the same shape:

```jsonc
{
  "id": "uuid",
  "type": "section",
  "props": { "padding": "lg", "bg": "var(--wf-color-bg)" },
  "children": [
    { "id": "…", "type": "hero", "props": { "title": "…" }, "children": [] }
  ]
}
```

Each block type defines: a **zod schema** for its props (`shared`), a **React edit
component** (`app`), and a **render function** (`renderer`). Props reference Brand Kit
tokens (e.g. `var(--wf-color-primary)`), so token changes propagate automatically.

The five essential blocks (Phase 1): **Section, Hero, Text, Image, Button**.

### Brand Kit → design tokens

`BrandKit` (colors, fonts, spacing, radius) is flattened into CSS custom properties
(`--wf-*`) by `brandKitToCssVars()` — the single source shared by editor and renderer,
so the live canvas and the published page produce identical variables.

### Layers (backend)

`routes → controllers → services → models`, with zod validation on every mutating
endpoint, JWT (access + refresh) auth, and multi-tenant access control via workspace
membership (`user → workspace → N sites → N pages`).

### Migration-ready boundaries

- **`PublishService`** — `publish(site)` / `unpublish(site)`. MVP writes static HTML to
  disk and serves it at `/s/:slug`. Phase 5 swaps in a Cloudflare Pages implementation
  behind the same interface.
- **`StorageService`** — `put/get/remove/url`. MVP uses local disk (`/uploads`); Phase 5
  swaps in Cloudflare R2.
- **`PaymentService`** — `createCheckout` / `verifyWebhook`. `mock` (local, no keys),
  `stripe`, and `mercadopago` drivers behind one interface.

Selected by env (`PUBLISH_DRIVER`, `STORAGE_DRIVER`, `PAYMENT_DRIVER`) and exposed as
singletons.

### Built to scale from Phase 1

- Autosave is **debounced (1.5s)** via PATCH — never per keystroke; no permanent
  websockets in the MVP.
- Mongo indexes: `User.email` (unique), `Site.workspace`, `Site.slug` (unique),
  `Page.site+slug` (unique).
- `.lean()` reads on the publish path; in-memory cache of published page HTML
  (invalidated on publish/unpublish); pagination on listings.

---

## Tech stack

- **Backend:** Node 20+, Express, MongoDB (Mongoose), zod, JWT, bcrypt — ESM, run with `tsx`.
- **Editor:** React 18, TypeScript, Vite, Zustand, dnd-kit, TailwindCSS.
- **Renderer:** custom, dependency-free engine (`@webforge/shared` only).
- **Tests:** Vitest (engine + block unit tests; API end-to-end with `mongodb-memory-server`).

---

## Getting started

### Prerequisites

- Node.js **20+** (developed on Node 24)
- A MongoDB connection string (local `mongod`, or MongoDB Atlas)

### Install

```bash
npm install            # installs all workspaces
cp .env.example .env    # then fill in the values
```

Minimum to boot locally — set in `.env`:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/webforge
JWT_ACCESS_SECRET=...      # any non-default string
JWT_REFRESH_SECRET=...
```

### Develop

```bash
npm run dev        # API (:4000) + editor (:5173) together
# or individually:
npm run dev:api
npm run dev:app
```

Open the editor at **http://localhost:5173** (it proxies `/api`, `/s`, `/uploads` to the
API). Register an account → a workspace + default Brand Kit are provisioned → create a
site (gets a starter Home page) → drag blocks, edit tokens, autosave, preview, publish.

Published sites are served at **http://localhost:4000/s/:slug**.

### Test

```bash
npm test           # all workspaces (shared + renderer unit tests, API e2e)
```

> The API test downloads a MongoDB binary on first run (via `mongodb-memory-server`).

### Production build

```bash
npm run build      # builds the editor into app/dist
npm start          # API serves the API + published sites + the built editor (one origin)
```

---

## Deploy (Railway Hobby — MVP)

Everything runs in **one Express deploy**: API + editor + preview/publish.

- `railway.json` is included: build `npm ci && npm run build`, start `npm start`,
  healthcheck `/api/health`.
- Set env vars in Railway (see `.env.example`): `MONGODB_URI` (Atlas), `JWT_*` secrets,
  `PUBLIC_URL` (your Railway URL), `APP_ORIGIN`.

---

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create user + workspace + Brand Kit |
| `POST` | `/api/auth/login` | Login → access + refresh tokens |
| `POST` | `/api/auth/refresh` | Rotate access token |
| `GET`  | `/api/auth/me` | Current user + workspaces |
| `GET/POST` | `/api/workspaces/:id/sites` | List / create sites (paginated) |
| `GET/PATCH/DELETE` | `/api/sites/:id` | Read / update / delete a site |
| `GET/POST` | `/api/sites/:id/pages` | List / create pages |
| `GET/PATCH/DELETE` | `/api/pages/:id` | Read / **autosave tree** / delete |
| `GET` | `/api/pages/:id/preview` | Rendered draft HTML (editor preview) |
| `GET/PATCH` | `/api/workspaces/:id/brandkit` | Read / update design tokens |
| `POST` | `/api/sites/:id/publish` · `/unpublish` | Publish / unpublish |
| `POST` | `/api/workspaces/:id/assets` · `GET` | Upload / list image assets |
| `POST` | `/api/workspaces/:id/generate-site` | **AI** — build a full site from a business prompt |
| `GET/POST` | `/api/workspaces/:id/products` · `/api/products/:id` | Product CRUD |
| `GET` | `/api/workspaces/:id/orders` | List orders (admin) |
| `POST` | `/api/storefront/:siteId/checkout` | **Public** checkout → payment redirect URL |
| `POST` | `/api/payments/webhook` | **Public** provider webhook (Stripe/MP) |
| `GET` | `/s/:siteSlug[/:pageSlug]` | **Public** published site (no auth) |

---

## Roadmap

- **Phase 1 (done):** scaffold, multi-tenant auth, models, editor + drag&drop, Brand Kit
  tokens, autosave, renderer, responsive preview, abstracted publish/storage; plus image
  uploads, page management and CI.
- **Phase 2 (done):** AI site generation — a business prompt → structured plan (Claude,
  forced tool use) → full site (pages + copy + palette + fonts) + a monogram logo maker.
  Set `ANTHROPIC_API_KEY` to enable; the endpoint degrades gracefully (501) without it.
- **Phase 3 (done):** e-commerce — product CRUD, public storefront checkout with
  server-side pricing, and a `PaymentService` abstraction with three drivers
  (`mock` by default — works with no keys; `stripe` and `mercadopago` real
  integrations) selected by `PAYMENT_DRIVER`. Orders + provider webhooks included.
- **Phase 4:** events + RSVP + forms. Models are already in place.
- **Phase 5:** productive publishing (Cloudflare Pages + R2, custom domains + SSL),
  real code export.
