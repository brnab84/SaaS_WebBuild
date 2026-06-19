import { Router } from "express";
import { updateProductSchema } from "@webforge/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deleteProductHandler,
  getProductHandler,
  updateProductHandler,
} from "../controllers/product.controller.js";

export const productRouter = Router();

productRouter.use(requireAuth);
productRouter.get("/:id", asyncHandler(getProductHandler));
productRouter.patch("/:id", validate(updateProductSchema), asyncHandler(updateProductHandler));
productRouter.delete("/:id", asyncHandler(deleteProductHandler));
