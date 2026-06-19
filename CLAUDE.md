# CLAUDE.md — WebForge

Guidance for working in this repo. See `README.md` for the product overview.

## What this is

AI-first multi-tenant website builder. TypeScript monorepo, **ESM everywhere**, run with
`tsx` (backend) and Vite (editor) — **no compile step for `api`/`shared`/`renderer`**.

## Workspaces

- `packages/shared` (`@webforge/shared`) — zod schemas + types: the block tree, design
  tokens, and API DTOs. **The single source of truth shared by all three other packages.**
- `renderer` (`@webforge/renderer`) — pure, dependency-light engine: block JSON → HTML+CSS.
- `api` (`@webforge/api`) — Express + Mongoose backend.
- `app` (`@webforge/app`) — React + Vite editor.

Packages import each other by name; each exposes its TS **source** via `exports`
(`./src/index.ts`), resolved directly by `tsx`/Vite/Vitest. Don't add build steps.

## Commands

```bash
npm install            # all workspaces
npm run dev            # api (:4000) + app (:5173)
npm test               # shared + renderer unit tests, api e2e (mongodb-memory-server)
npm run build          # app -> app/dist (served by the api in prod)
npm start              # production: api serves API + /s published sites + the editor
```

Per-package typecheck: `npm run typecheck --workspace @webforge/<pkg>` (or `npx tsc --noEmit`).

## Conventions & invariants (don't break these)

- **Design tokens:** CSS variables are named `--wf-*` (e.g. `--wf-color-primary`,
  `--wf-space-lg`). `brandKitToCssVars()` in `shared/tokens.ts` is the one place that
  maps a `BrandKit` to those names — editor canvas and renderer both use it, so they
  stay identical. Block props reference tokens as `var(--wf-...)` so changes propagate.
- **Block tree:** every node is `{ id, type, props, children }`. Leaves carry an empty
  `children: []`. Adding a block type means updating four places: a zod props schema +
  `makeBlock`/`BLOCK_LIBRARY` (`shared/blocks.ts`), a renderer in `renderer/registry.ts`,
  a canvas visual in `app/components/canvas`, and a properties form in
  `app/components/panels/PropertiesPanel.tsx`.
- **Autosave is debounced 1.5s** (`app/store/editor.ts`) via `PATCH /api/pages/:id` — never
  per keystroke, no websockets. The whole tree is sent and re-validated server-side.
- **Backend layering:** `routes → controllers → services → models`. Controllers stay thin;
  business logic lives in services. Every mutating route validates with `validate(schema)`
  using the shared zod schemas. Throw `HttpError` (helpers in `utils/http-error.ts`); the
  central error handler maps it.
- **Multi-tenancy:** access is gated by workspace membership via
  `requireWorkspace` / `requireSite` (`services/access.service.ts`). Never query a tenant
  resource without an access check.
- **Migration seams:** `PublishService` and `StorageService` are interfaces with local
  implementations selected by env. Keep all publish/storage specifics behind them.
- **Renderer is pure & escapes everything** — user strings go through `escape*` / `safeUrl`.
  Keep it free of DB/Express imports so it stays unit-testable and reusable for export.

## Tests

- `renderer/src/render.test.ts` and `packages/shared/src/blocks.test.ts` — engine + schema.
- `api/src/api.test.ts` — full HTTP flow (register → site → autosave → publish → serve)
  against an in-memory Mongo. First run downloads a `mongod` binary.

## Phasing

Phases 1 (MVP), 2 (AI generation + logo maker), 3 (e-commerce) and 4 (events + RSVP +
forms) are implemented.

- **AI** lives in `api/src/services/ai/` — Claude returns a **flat** plan via forced
  `tool_use` (structured outputs needs zod v4; we're on v3, so tool_use keeps it
  version-safe), and the pure `buildSiteFromPlan` turns it into a valid block tree.
  `ANTHROPIC_API_KEY` enables it; otherwise the endpoint returns 501.
- **Payments** follow the same migration-seam pattern as publish/storage:
  `PaymentService` (`api/src/services/payment/`) with `mock`/`stripe`/`mercadopago`
  drivers selected by `PAYMENT_DRIVER` (default `mock`, no keys needed). Checkout prices
  are always computed server-side from the DB; the webhook route uses the raw body.

- **Events** (`api/src/services/event.service.ts`, `form.service.ts`): event CRUD,
  public RSVP (de-duped by email, capacity-enforced) and a generic `FormSubmission`
  capture. Public endpoints live under `/api/storefront`.

Phase 5 (productive publishing/export) is the only remaining phase — keep it
**architecture-only** (the publish/storage seams already exist); don't implement that
logic unless asked.
