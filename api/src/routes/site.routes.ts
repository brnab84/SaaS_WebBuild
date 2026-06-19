import { Router } from "express";
import {
  createPageSchema,
  paginationQuerySchema,
  updateSiteSchema,
} from "@webforge/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deleteSiteHandler,
  getSiteHandler,
  listSitesHandler,
  updateSiteHandler,
} from "../controllers/site.controller.js";
import { getSiteBrandKitHandler } from "../controllers/brandkit.controller.js";
import {
  createPageHandler,
  listPagesHandler,
} from "../controllers/page.controller.js";
import {
  publishHandler,
  unpublishHandler,
} from "../controllers/publish.controller.js";

export const siteRouter = Router();

siteRouter.use(requireAuth);

siteRouter.get("/", validate(paginationQuerySchema, "query"), asyncHandler(listSitesHandler));
siteRouter.get("/:id", asyncHandler(getSiteHandler));
siteRouter.patch("/:id", validate(updateSiteSchema), asyncHandler(updateSiteHandler));
siteRouter.delete("/:id", asyncHandler(deleteSiteHandler));

siteRouter.get("/:id/brandkit", asyncHandler(getSiteBrandKitHandler));

siteRouter.get("/:id/pages", asyncHandler(listPagesHandler));
siteRouter.post("/:id/pages", validate(createPageSchema), asyncHandler(createPageHandler));

siteRouter.post("/:id/publish", asyncHandler(publishHandler));
siteRouter.post("/:id/unpublish", asyncHandler(unpublishHandler));
