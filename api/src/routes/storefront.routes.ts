import { Router } from "express";
import { checkoutSchema, formSubmitSchema, rsvpSchema } from "@webforge/shared";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createCheckoutHandler,
  mockConfirmHandler,
  orderStatusHandler,
} from "../controllers/checkout.controller.js";
import { rsvpHandler } from "../controllers/event.controller.js";
import { submitFormHandler } from "../controllers/form.controller.js";

/** Public storefront endpoints (no auth — visitors don't have accounts). */
export const storefrontRouter = Router();

// Phase 4 — public RSVP and form submission (literal routes first).
storefrontRouter.post(
  "/events/:eventId/rsvp",
  validate(rsvpSchema),
  asyncHandler(rsvpHandler),
);
storefrontRouter.post(
  "/:siteId/forms/:formName",
  validate(formSubmitSchema),
  asyncHandler(submitFormHandler),
);

storefrontRouter.post(
  "/:siteId/checkout",
  validate(checkoutSchema),
  asyncHandler(createCheckoutHandler),
);
// Mock provider confirmation (stands in for the real provider callback).
storefrontRouter.post("/mock/:orderId/confirm", asyncHandler(mockConfirmHandler));
// Public minimal order status (e.g. for a success page poll).
storefrontRouter.get("/orders/:orderId", asyncHandler(orderStatusHandler));
