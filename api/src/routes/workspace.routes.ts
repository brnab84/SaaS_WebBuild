import { Router } from "express";
import {
  createProductSchema,
  createSiteSchema,
  generateSiteSchema,
  paginationQuerySchema,
  updateBrandKitSchema,
} from "@webforge/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { imageUpload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/async-handler.js";
import { listWorkspacesHandler } from "../controllers/workspace.controller.js";
import {
  listAssetsHandler,
  uploadAssetHandler,
} from "../controllers/asset.controller.js";
import {
  getBrandKitHandler,
  updateBrandKitHandler,
} from "../controllers/brandkit.controller.js";
import {
  createSiteHandler,
  listSitesHandler,
} from "../controllers/site.controller.js";
import { generateSiteHandler } from "../controllers/ai.controller.js";
import {
  createProductHandler,
  listProductsHandler,
} from "../controllers/product.controller.js";
import { listOrdersHandler } from "../controllers/checkout.controller.js";

export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);

workspaceRouter.get("/", asyncHandler(listWorkspacesHandler));

workspaceRouter.get("/:workspaceId/brandkit", asyncHandler(getBrandKitHandler));
workspaceRouter.patch(
  "/:workspaceId/brandkit",
  validate(updateBrandKitSchema),
  asyncHandler(updateBrandKitHandler),
);

workspaceRouter.get(
  "/:workspaceId/sites",
  validate(paginationQuerySchema, "query"),
  asyncHandler(listSitesHandler),
);
workspaceRouter.post(
  "/:workspaceId/sites",
  validate(createSiteSchema),
  asyncHandler(createSiteHandler),
);

// Phase 2 — AI site generation (prompt -> full site).
workspaceRouter.post(
  "/:workspaceId/generate-site",
  validate(generateSiteSchema),
  asyncHandler(generateSiteHandler),
);

// Phase 3 — e-commerce: products + orders (workspace-scoped, admin).
workspaceRouter.get(
  "/:workspaceId/products",
  validate(paginationQuerySchema, "query"),
  asyncHandler(listProductsHandler),
);
workspaceRouter.post(
  "/:workspaceId/products",
  validate(createProductSchema),
  asyncHandler(createProductHandler),
);
workspaceRouter.get(
  "/:workspaceId/orders",
  validate(paginationQuerySchema, "query"),
  asyncHandler(listOrdersHandler),
);

workspaceRouter.get(
  "/:workspaceId/assets",
  validate(paginationQuerySchema, "query"),
  asyncHandler(listAssetsHandler),
);
workspaceRouter.post("/:workspaceId/assets", imageUpload, asyncHandler(uploadAssetHandler));
