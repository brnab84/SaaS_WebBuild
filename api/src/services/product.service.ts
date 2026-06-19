import type {
  CreateProductInput,
  Paginated,
  PaginationQuery,
  ProductDTO,
  UpdateProductInput,
} from "@webforge/shared";
import { Product, type ProductDoc } from "../models/Product.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { slugify, withRandomSuffix } from "../utils/slug.js";
import { requireSite, requireWorkspace } from "./access.service.js";

export function toProductDTO(p: ProductDoc): ProductDTO {
  return {
    id: p._id.toString(),
    workspace: p.workspace.toString(),
    site: p.site ? p.site.toString() : null,
    title: p.title,
    slug: p.slug,
    description: p.description,
    priceCents: p.priceCents,
    currency: p.currency,
    images: p.images,
    stock: p.stock,
    active: p.active,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function uniqueProductSlug(workspaceId: string, title: string): Promise<string> {
  let slug = slugify(title);
  while (await Product.exists({ workspace: workspaceId, slug })) {
    slug = withRandomSuffix(slugify(title));
  }
  return slug;
}

async function requireProduct(productId: string, userId: string) {
  const product = await Product.findById(productId);
  if (!product) throw notFound("Product not found");
  await requireWorkspace(product.workspace.toString(), userId);
  return product;
}

export async function createProduct(
  workspaceId: string,
  userId: string,
  input: CreateProductInput,
): Promise<ProductDTO> {
  await requireWorkspace(workspaceId, userId);
  // If associated with a site, the site must belong to this workspace.
  if (input.siteId) {
    const site = await requireSite(input.siteId, userId);
    if (site.workspace.toString() !== workspaceId) throw badRequest("Site is in another workspace");
  }
  const slug = await uniqueProductSlug(workspaceId, input.title);
  const product = await Product.create({
    workspace: workspaceId,
    site: input.siteId ?? null,
    title: input.title,
    slug,
    description: input.description ?? "",
    priceCents: input.priceCents,
    currency: input.currency,
    images: input.images,
    stock: input.stock ?? null,
    active: input.active,
  });
  return toProductDTO(product);
}

export async function listProducts(
  workspaceId: string,
  userId: string,
  query: PaginationQuery & { siteId?: string },
): Promise<Paginated<ProductDTO>> {
  await requireWorkspace(workspaceId, userId);
  const filter: Record<string, unknown> = { workspace: workspaceId };
  if (query.siteId) filter.site = query.siteId;

  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  return {
    items: items.map(toProductDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getProduct(productId: string, userId: string): Promise<ProductDTO> {
  return toProductDTO(await requireProduct(productId, userId));
}

export async function updateProduct(
  productId: string,
  userId: string,
  input: UpdateProductInput,
): Promise<ProductDTO> {
  const product = await requireProduct(productId, userId);
  if (input.title !== undefined) product.title = input.title;
  if (input.description !== undefined) product.description = input.description;
  if (input.priceCents !== undefined) product.priceCents = input.priceCents;
  if (input.currency !== undefined) product.currency = input.currency;
  if (input.images !== undefined) product.images = input.images;
  if (input.stock !== undefined) product.stock = input.stock;
  if (input.active !== undefined) product.active = input.active;
  await product.save();
  return toProductDTO(product);
}

export async function deleteProduct(productId: string, userId: string): Promise<void> {
  const product = await requireProduct(productId, userId);
  await product.deleteOne();
}
