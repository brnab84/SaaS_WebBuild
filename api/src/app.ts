import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { publicRouter } from "./routes/public.routes.js";
import { checkoutPagesRouter } from "./routes/checkout-pages.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { webhookHandler } from "./controllers/checkout.controller.js";
import { serveCustomDomainPage } from "./services/publish.service.js";
import { asyncHandler } from "./utils/async-handler.js";
import { storageService, LocalStorageService } from "./services/storage/index.js";
import { logger } from "./utils/logger.js";

export function createApp(): express.Express {
  const app = express();

  // Tailored CSP. Published pages and the srcdoc preview carry inline styles and
  // inline <script> (the storefront blocks + the window.__WF bootstrap), and load
  // Google Fonts — so 'unsafe-inline' for script/style is unavoidable by design.
  // We still lock down object/base/frame-ancestors and constrain where dynamic
  // blocks may fetch (the API origin, possibly a different host for custom domains)
  // and where images/fonts may load from.
  const connectSrc = [
    "'self'",
    env.PUBLIC_URL,
    env.R2_PUBLIC_URL,
    env.R2_PUBLISH_PUBLIC_URL,
  ].filter((v): v is string => Boolean(v));
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc,
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: [env.APP_ORIGIN, env.PUBLIC_URL],
      credentials: true,
    }),
  );
  // Payment webhook needs the RAW body for signature verification (Stripe), so
  // it must be registered before the JSON body parser.
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "*/*" }),
    asyncHandler(webhookHandler),
  );

  app.use(express.json({ limit: "4mb" }));

  // Tiny request log (dev only) — swap for pino-http later.
  if (env.NODE_ENV !== "test") {
    app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });
  }

  // Custom-domain serving (Phase 5): if the request's Host matches a published
  // site's custom domain, serve that site directly. Skips the app's own host.
  const appHost = new URL(env.PUBLIC_URL).hostname;
  app.use(
    asyncHandler(async (req, res, next) => {
      const host = req.hostname;
      if (
        req.method !== "GET" ||
        !host ||
        host === appHost ||
        host === "localhost" ||
        host === "127.0.0.1"
      ) {
        return next();
      }
      const html = await serveCustomDomainPage(host, req.path);
      if (html == null) return next();
      res.type("html").send(html);
    }),
  );

  // Serve uploaded assets (StorageService local driver).
  if (storageService instanceof LocalStorageService) {
    app.use(storageService.mountPath, express.static(storageService.directory));
  }

  // JSON API + public published-site serving + hosted-checkout pages.
  app.use("/api", apiRouter);
  app.use("/s", publicRouter);
  app.use("/checkout", checkoutPagesRouter);

  // Serve the built editor SPA (production). In dev it runs on the Vite server.
  const appDist = resolve(import.meta.dirname, "../../app/dist");
  if (existsSync(appDist)) {
    app.use(express.static(appDist));
    app.get("*", (req, res, next) => {
      // Use trailing-slash prefixes so SPA routes like /store aren't mistaken
      // for the published-site router (/s/...).
      if (
        req.path.startsWith("/api/") ||
        req.path.startsWith("/s/") ||
        req.path.startsWith("/uploads/") ||
        req.path.startsWith("/checkout/")
      ) {
        return next();
      }
      res.sendFile(resolve(appDist, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => {
      res.json({
        service: "webforge-api",
        editor: `Run the editor dev server (npm run dev:app) — expected at ${env.APP_ORIGIN}`,
        health: "/api/health",
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
