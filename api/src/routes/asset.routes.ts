import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { deleteAssetHandler } from "../controllers/asset.controller.js";

export const assetRouter = Router();

assetRouter.use(requireAuth);
assetRouter.delete("/:id", asyncHandler(deleteAssetHandler));
