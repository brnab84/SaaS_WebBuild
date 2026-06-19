import { Router } from "express";
import { updateEventSchema } from "@webforge/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deleteEventHandler,
  getEventHandler,
  updateEventHandler,
} from "../controllers/event.controller.js";

export const eventRouter = Router();

eventRouter.use(requireAuth);
eventRouter.get("/:id", asyncHandler(getEventHandler));
eventRouter.patch("/:id", validate(updateEventSchema), asyncHandler(updateEventHandler));
eventRouter.delete("/:id", asyncHandler(deleteEventHandler));
