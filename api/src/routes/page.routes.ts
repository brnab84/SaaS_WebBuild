import { Router } from "express";
import { savePageSchema } from "@webforge/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deletePageHandler,
  getPageHandler,
  previewPageHandler,
  savePageHandler,
} from "../controllers/page.controller.js";

export const pageRouter = Router();

pageRouter.use(requireAuth);

pageRouter.get("/:id", asyncHandler(getPageHandler));
// Autosave endpoint — full validated tree, called debounced (1.5s) by the editor.
pageRouter.patch("/:id", validate(savePageSchema), asyncHandler(savePageHandler));
pageRouter.delete("/:id", asyncHandler(deletePageHandler));
pageRouter.get("/:id/preview", asyncHandler(previewPageHandler));
