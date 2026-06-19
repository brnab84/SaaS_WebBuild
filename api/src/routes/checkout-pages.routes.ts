import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import {
  cancelPageHandler,
  mockCheckoutPageHandler,
  successPageHandler,
} from "../controllers/checkout.controller.js";

/** Public hosted-checkout HTML pages, mounted at /checkout. */
export const checkoutPagesRouter = Router();

checkoutPagesRouter.get("/mock/:orderId", asyncHandler(mockCheckoutPageHandler));
checkoutPagesRouter.get("/success/:orderId", asyncHandler(successPageHandler));
checkoutPagesRouter.get("/cancel/:orderId", asyncHandler(cancelPageHandler));
