import { Router } from "express";
import { checkoutSchema } from "@webforge/shared";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createCheckoutHandler,
  mockConfirmHandler,
  orderStatusHandler,
} from "../controllers/checkout.controller.js";

/** Public storefront endpoints (no auth — buyers don't have accounts). */
export const storefrontRouter = Router();

storefrontRouter.post(
  "/:siteId/checkout",
  validate(checkoutSchema),
  asyncHandler(createCheckoutHandler),
);
// Mock provider confirmation (stands in for the real provider callback).
storefrontRouter.post("/mock/:orderId/confirm", asyncHandler(mockConfirmHandler));
// Public minimal order status (e.g. for a success page poll).
storefrontRouter.get("/orders/:orderId", asyncHandler(orderStatusHandler));
