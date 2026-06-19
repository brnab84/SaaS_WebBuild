import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { publicRouter } from "./routes/public.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { storageService, LocalStorageService } from "./services/storage/index.js";
import { logger } from "./utils/logger.js";

export function createApp(): express.Express {
  const app = express();

  // CSP is intentionally off: published pages carry their own inline styles and
  // load Google Fonts; the preview iframe must also render freely. Re-enable a
  // tailored policy in Phase 5 (productive publishing).
  app.use(
    helmet({
      contentSecurityPolicy: false,
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
  app.use(express.json({ limit: "4mb" }));

  // Tiny request log (dev only) — swap for pino-http later.
  if (env.NODE_ENV !== "test") {
    app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });
  }

  // Serve uploaded assets (StorageService local driver).
  if (storageService instanceof LocalStorageService) {
    app.use(storageService.mountPath, express.static(storageService.directory));
  }

  // JSON API + public published-site serving.
  app.use("/api", apiRouter);
  app.use("/s", publicRouter);

  // Serve the built editor SPA (production). In dev it runs on the Vite server.
  const appDist = resolve(import.meta.dirname, "../../app/dist");
  if (existsSync(appDist)) {
    app.use(express.static(appDist));
    app.get("*", (req, res, next) => {
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/s") ||
        req.path.startsWith("/uploads")
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
