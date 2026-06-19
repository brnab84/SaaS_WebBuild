import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { servePublishedHandler } from "../controllers/publish.controller.js";

/** Public serving of published sites at /s/:siteSlug[/:pageSlug] (no auth). */
export const publicRouter = Router();

publicRouter.get("/:siteSlug", asyncHandler(servePublishedHandler));
publicRouter.get("/:siteSlug/:pageSlug", asyncHandler(servePublishedHandler));
