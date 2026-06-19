import type { Request, Response } from "express";
import type { PaginationQuery } from "@webforge/shared";
import { escapeHtml } from "@webforge/renderer";
import { env } from "../config/env.js";
import { userId } from "../middleware/auth.js";
import {
  createCheckout,
  getOrderStatus,
  handlePaymentWebhook,
  listOrders,
  markOrderPaid,
} from "../services/checkout.service.js";

/* ------------------------------ public checkout --------------------------- */

export async function createCheckoutHandler(req: Request, res: Response): Promise<void> {
  res.status(201).json(await createCheckout(req.params.siteId!, req.body));
}

function page(title: string, body: string): string {
  return (
    `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
    `<body style="font-family:system-ui;max-width:560px;margin:6rem auto;padding:0 1rem;color:#0f172a">` +
    body +
    `</body>`
  );
}

/** Mock provider "hosted" checkout page with a Pay button. */
export async function mockCheckoutPageHandler(req: Request, res: Response): Promise<void> {
  const orderId = req.params.orderId!;
  const order = await getOrderStatus(orderId);
  if (!order) {
    res.status(404).type("html").send(page("Not found", "<h1>Order not found</h1>"));
    return;
  }
  if (order.status !== "pending") {
    res
      .type("html")
      .send(page("Paid", `<h1>✅ Order already ${escapeHtml(order.status)}</h1>`));
    return;
  }
  const amount = (order.totalCents / 100).toFixed(2);
  res.type("html").send(
    page(
      "Checkout (test)",
      `<h1 style="margin:0 0 .25rem">Test checkout</h1>` +
        `<p style="color:#64748b">Simulated payment — no real charge.</p>` +
        `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem;margin:1.5rem 0">` +
        `<p style="margin:0;font-size:.9rem;color:#64748b">Amount due</p>` +
        `<p style="margin:.2rem 0 0;font-size:2rem;font-weight:700">${escapeHtml(order.currency)} ${amount}</p>` +
        `</div>` +
        `<form method="POST" action="${env.PUBLIC_URL}/api/storefront/mock/${escapeHtml(orderId)}/confirm">` +
        `<button style="background:#4f46e5;color:#fff;border:0;padding:.8rem 1.6rem;border-radius:999px;font-weight:600;font-size:1rem;cursor:pointer">Pay ${escapeHtml(order.currency)} ${amount}</button>` +
        `</form>`,
    ),
  );
}

/** Mock confirm — marks the order paid (stands in for the provider callback). */
export async function mockConfirmHandler(req: Request, res: Response): Promise<void> {
  const orderId = req.params.orderId!;
  await markOrderPaid(orderId);
  // Browser form post -> redirect to the success page; API callers can read 200.
  if ((req.headers.accept ?? "").includes("text/html")) {
    res.redirect(`${env.PUBLIC_URL}/checkout/success/${orderId}`);
    return;
  }
  res.json({ ok: true, orderId, status: "paid" });
}

export async function successPageHandler(req: Request, res: Response): Promise<void> {
  const order = await getOrderStatus(req.params.orderId!);
  res
    .type("html")
    .send(
      page(
        "Thank you",
        `<h1>🎉 Thank you!</h1><p>Your order is <strong>${escapeHtml(order?.status ?? "confirmed")}</strong>.</p>`,
      ),
    );
}

export async function cancelPageHandler(_req: Request, res: Response): Promise<void> {
  res.type("html").send(page("Cancelled", "<h1>Checkout cancelled</h1><p>No charge was made.</p>"));
}

export async function orderStatusHandler(req: Request, res: Response): Promise<void> {
  const order = await getOrderStatus(req.params.orderId!);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
}

/* ------------------------------ provider webhook -------------------------- */

/** Public webhook for real providers (raw body — mounted before express.json). */
export async function webhookHandler(req: Request, res: Response): Promise<void> {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  await handlePaymentWebhook(raw, req.headers as Record<string, string | undefined>);
  res.json({ received: true });
}

/* --------------------------------- admin ---------------------------------- */

export async function listOrdersHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PaginationQuery;
  res.json(await listOrders(req.params.workspaceId!, userId(req), query));
}
