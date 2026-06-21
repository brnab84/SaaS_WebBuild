import { Router } from "express";
import {
  adminResetUserPasswordSchema,
  adminUpdateUserSchema,
  paginationQuerySchema,
} from "@webforge/shared";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deleteSiteHandler,
  deleteUserHandler,
  resetUserPasswordHandler,
  sitesHandler,
  statsHandler,
  updateUserHandler,
  usersHandler,
  workspacesHandler,
} from "../controllers/admin.controller.js";

/** Platform admin — super-admin only (the product owner). */
export const adminRouter = Router();

adminRouter.use(requireAuth, asyncHandler(requireSuperAdmin));

adminRouter.get("/stats", asyncHandler(statsHandler));
adminRouter.get("/users", validate(paginationQuerySchema, "query"), asyncHandler(usersHandler));
adminRouter.patch(
  "/users/:id",
  validate(adminUpdateUserSchema),
  asyncHandler(updateUserHandler),
);
adminRouter.post(
  "/users/:id/reset-password",
  validate(adminResetUserPasswordSchema),
  asyncHandler(resetUserPasswordHandler),
);
adminRouter.delete("/users/:id", asyncHandler(deleteUserHandler));
adminRouter.get(
  "/workspaces",
  validate(paginationQuerySchema, "query"),
  asyncHandler(workspacesHandler),
);
adminRouter.get("/sites", validate(paginationQuerySchema, "query"), asyncHandler(sitesHandler));
adminRouter.delete("/sites/:id", asyncHandler(deleteSiteHandler));
