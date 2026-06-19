# Deploying WebForge to Railway

WebForge ships as a **single Railway service**: one Express process serves the API, the
published sites (`/s/...`), the hosted checkout pages, and the built editor SPA. The only
external dependency is **MongoDB**.

`railway.json` is already configured:

```jsonc
build:  npm ci && npm run build      // installs workspaces + builds the editor → app/dist
deploy: npm run start                // tsx src/server.ts (the API serves everything)
        healthcheck: /api/health
```

> The production start command was verified locally end-to-end (SPA served, health,
> register, publish + serve a published site).

---

## 1. Get a MongoDB database

Pick one:

- **MongoDB Atlas (recommended, free tier):** create a free M0 cluster at
  [mongodb.com/atlas](https://www.mongodb.com/atlas), add a database user, allow access
  from anywhere (`0.0.0.0/0`) or from Railway's egress, and copy the connection string
  (`mongodb+srv://user:pass@cluster.../`).
- **Railway MongoDB:** add a MongoDB database to your project from the Railway dashboard;
  it exposes a `MONGO_URL` you can reference.

---

## 2. Create the Railway service

**Option A — GitHub (recommended):**
1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** →
   pick `brnab84/SaaS_WebBuild`.
2. Railway detects `railway.json` and uses it automatically.

**Option B — Railway CLI:**
```bash
npm i -g @railway/cli
railway login
railway init           # in the repo root
railway up             # builds & deploys
```

---

## 3. Set environment variables

In the service's **Variables** tab, set:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas/Railway connection string |
| `MONGODB_DB_NAME` | `webforge` |
| `JWT_ACCESS_SECRET` | a long random string (see below) |
| `JWT_REFRESH_SECRET` | a different long random string |
| `PUBLIC_URL` | your Railway URL, e.g. `https://webforge-production.up.railway.app` |
| `APP_ORIGIN` | same as `PUBLIC_URL` (the editor is same-origin in prod) |

Generate the secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # run twice
```

> The server **refuses to start in production with the default `change-me` secrets** — set
> real ones or the deploy will exit on boot (this is intentional).

`PORT` is injected by Railway automatically — don't set it.

### Optional integrations (enable when you have keys)

| Feature | Variables |
| --- | --- |
| **AI generation** (Phase 2) | `ANTHROPIC_API_KEY` (`ANTHROPIC_MODEL` defaults to `claude-opus-4-8`) |
| **Stripe checkout** (Phase 3) | `PAYMENT_DRIVER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Mercado Pago** (Phase 3) | `PAYMENT_DRIVER=mercadopago`, `MERCADOPAGO_ACCESS_TOKEN` |
| **Cloudflare R2** (Phase 5) | `STORAGE_DRIVER=r2` / `PUBLISH_DRIVER=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `R2_PUBLISH_BUCKET`, `R2_PUBLISH_PUBLIC_URL` |

Without these, the app runs fine on its defaults: AI returns `501`, payments use the local
`mock` driver, and storage/publishing use local disk.

---

## 4. First deploy & verify

1. Railway builds (`npm ci && npm run build`) and starts (`npm run start`).
2. Once live, open the Railway URL — you should see the editor login.
3. Health check: `GET https://<your-url>/api/health` → `{"status":"ok"}`.
4. If you set `PUBLIC_URL` **after** the first deploy, redeploy so publish/checkout URLs
   use the right origin.

> ⚠️ Local-disk storage/publishing (the defaults) live on the container filesystem, which
> is **ephemeral** on Railway — uploads and published files are lost on redeploy. For
> durable production, switch `STORAGE_DRIVER`/`PUBLISH_DRIVER` to `r2`.

---

## 5. Custom domains

- **App domain:** add a custom domain to the Railway service (Settings → Networking).
- **Per-site domains:** set a site's custom domain in the editor (🌐 Domain). Point that
  domain's DNS at the Railway service; WebForge serves the published site by Host header,
  and Railway terminates SSL.
