import type { Request, Response } from "express";
import type { PaginationQuery } from "@webforge/shared";
import { userId } from "../middleware/auth.js";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../services/product.service.js";

export async function createProductHandler(req: Request, res: Response): Promise<void> {
  res.status(201).json(await createProduct(req.params.workspaceId!, userId(req), req.body));
}

export async function listProductsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PaginationQuery;
  const siteId = typeof req.query.siteId === "string" ? req.query.siteId : undefined;
  res.json(await listProducts(req.params.workspaceId!, userId(req), { ...query, siteId }));
}

export async function getProductHandler(req: Request, res: Response): Promise<void> {
  res.json(await getProduct(req.params.id!, userId(req)));
}

export async function updateProductHandler(req: Request, res: Response): Promise<void> {
  res.json(await updateProduct(req.params.id!, userId(req), req.body));
}

export async function deleteProductHandler(req: Request, res: Response): Promise<void> {
  await deleteProduct(req.params.id!, userId(req));
  res.status(204).end();
}
