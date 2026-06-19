import type {
  CheckoutInput,
  CheckoutResponse,
  OrderDTO,
  Paginated,
  PaginationQuery,
} from "@webforge/shared";
import { env } from "../config/env.js";
import { Order, type OrderDoc } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Site } from "../models/Site.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { requireWorkspace } from "./access.service.js";
import { sendEmail } from "./email.service.js";
import { paymentService } from "./payment/index.js";

export function toOrderDTO(o: OrderDoc): OrderDTO {
  return {
    id: o._id.toString(),
    workspace: o.workspace.toString(),
    site: o.site ? o.site.toString() : null,
    items: o.items.map((i) => ({
      product: i.product.toString(),
      title: i.title,
      priceCents: i.priceCents,
      quantity: i.quantity,
    })),
    totalCents: o.totalCents,
    currency: o.currency,
    status: o.status,
    provider: o.provider,
    customer: o.customer,
    createdAt: o.createdAt.toISOString(),
  };
}

/**
 * Public checkout for a site. Prices are taken from the DB (never trusted from
 * the client); creates a pending Order and hands off to the PaymentService for
 * a redirect URL.
 */
export async function createCheckout(
  siteId: string,
  input: CheckoutInput,
): Promise<CheckoutResponse> {
  const site = await Site.findById(siteId);
  if (!site) throw notFound("Site not found");

  const ids = input.items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: ids },
    workspace: site.workspace,
    active: true,
  });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  let currency: string | null = null;
  const orderItems = input.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw badRequest(`Product unavailable: ${item.productId}`);
    if (currency && currency !== product.currency) {
      throw badRequest("All items in an order must share the same currency");
    }
    currency = product.currency;
    return {
      product: product._id,
      title: product.title,
      priceCents: product.priceCents,
      quantity: item.quantity,
    };
  });

  const totalCents = orderItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  const order = await Order.create({
    workspace: site.workspace,
    site: site._id,
    items: orderItems,
    totalCents,
    currency: currency ?? "USD",
    status: "pending",
    customer: input.customer,
  });

  const session = await paymentService.createCheckout({
    orderId: order._id.toString(),
    items: orderItems.map((i) => ({
      title: i.title,
      priceCents: i.priceCents,
      quantity: i.quantity,
    })),
    totalCents,
    currency: order.currency,
    customer: input.customer,
    successUrl: `${env.PUBLIC_URL}/checkout/success/${order._id}`,
    cancelUrl: `${env.PUBLIC_URL}/checkout/cancel/${order._id}`,
  });

  order.provider = session.provider;
  order.providerRef = session.providerRef;
  await order.save();

  return { checkoutUrl: session.url, orderId: order._id.toString(), provider: session.provider };
}

/** Idempotently mark an order paid (from the mock confirm or a real webhook). */
export async function markOrderPaid(orderId: string): Promise<boolean> {
  const order = await Order.findById(orderId);
  if (!order) return false;
  if (order.status === "pending") {
    order.status = "paid";
    await order.save();
    if (order.customer?.email) {
      const total = `${order.currency} ${(order.totalCents / 100).toFixed(2)}`;
      await sendEmail({
        to: order.customer.email,
        subject: "Your order is confirmed",
        html: `<p>Hi ${order.customer.name},</p><p>We received your payment of <strong>${total}</strong>. Thank you!</p>`,
        text: `Payment of ${total} received. Thank you!`,
      });
    }
  }
  return true;
}

/** Public, minimal order status (for the success page). */
export async function getOrderStatus(
  orderId: string,
): Promise<{ id: string; status: string; totalCents: number; currency: string } | null> {
  const order = await Order.findById(orderId);
  if (!order) return null;
  return {
    id: order._id.toString(),
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
  };
}

/** Interpret a real provider webhook and update the order. */
export async function handlePaymentWebhook(
  rawBody: Buffer,
  headers: Record<string, string | undefined>,
): Promise<{ ok: boolean }> {
  const result = await paymentService.verifyWebhook(rawBody, headers);
  if (result.handled && result.status === "paid" && result.orderId) {
    await markOrderPaid(result.orderId);
  }
  return { ok: true };
}

/** Admin: list a workspace's orders (paginated). */
export async function listOrders(
  workspaceId: string,
  userId: string,
  query: PaginationQuery,
): Promise<Paginated<OrderDTO>> {
  await requireWorkspace(workspaceId, userId);
  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Order.find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments({ workspace: workspaceId }),
  ]);
  return {
    items: items.map(toOrderDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
