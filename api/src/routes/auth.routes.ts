import { Router } from "express";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "@webforge/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  loginHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
} from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), asyncHandler(registerHandler));
authRouter.post("/login", validate(loginSchema), asyncHandler(loginHandler));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(refreshHandler));
authRouter.get("/me", requireAuth, asyncHandler(meHandler));
authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(changePasswordHandler),
);
authRouter.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler),
);
authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);
