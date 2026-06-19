import { Router } from "express";
import { paginationQuerySchema } from "@webforge/shared";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deleteSiteHandler,
  sitesHandler,
  statsHandler,
  usersHandler,
  workspacesHandler,
} from "../controllers/admin.controller.js";

/** Platform admin — super-admin only (the product owner). */
export const adminRouter = Router();

adminRouter.use(requireAuth, asyncHandler(requireSuperAdmin));

adminRouter.get("/stats", asyncHandler(statsHandler));
adminRouter.get("/users", validate(paginationQuerySchema, "query"), asyncHandler(usersHandler));
adminRouter.get(
  "/workspaces",
  validate(paginationQuerySchema, "query"),
  asyncHandler(workspacesHandler),
);
adminRouter.get("/sites", validate(paginationQuerySchema, "query"), asyncHandler(sitesHandler));
adminRouter.delete("/sites/:id", asyncHandler(deleteSiteHandler));
