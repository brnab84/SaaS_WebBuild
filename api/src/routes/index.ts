import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { workspaceRouter } from "./workspace.routes.js";
import { siteRouter } from "./site.routes.js";
import { pageRouter } from "./page.routes.js";

/** All authenticated/JSON API routes, mounted under /api. */
export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "webforge-api", time: new Date().toISOString() });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/workspaces", workspaceRouter);
apiRouter.use("/sites", siteRouter);
apiRouter.use("/pages", pageRouter);
