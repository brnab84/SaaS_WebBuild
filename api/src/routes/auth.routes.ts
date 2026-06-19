import { Router } from "express";
import { loginSchema, refreshSchema, registerSchema } from "@webforge/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  loginHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), asyncHandler(registerHandler));
authRouter.post("/login", validate(loginSchema), asyncHandler(loginHandler));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(refreshHandler));
authRouter.get("/me", requireAuth, asyncHandler(meHandler));
