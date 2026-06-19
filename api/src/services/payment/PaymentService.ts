import type { PaymentProvider } from "@webforge/shared";

/**
 * PaymentService — abstraction over the checkout provider.
 *
 * MVP ships a `mock` driver (local simulated checkout, no credentials) that the
 * test suite and the editor exercise end-to-end. Real `stripe` and
 * `mercadopago` drivers implement the same interface and are selected by
 * PAYMENT_DRIVER — nothing else in the app changes. Same migration-seam pattern
 * as PublishService / StorageService.
 */
export interface CheckoutLineItem {
  title: string;
  priceCents: number;
  quantity: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  items: CheckoutLineItem[];
  totalCents: number;
  currency: string;
  customer: { name: string; email: string };
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  url: string;
  providerRef: string;
  provider: PaymentProvider;
}

export interface WebhookResult {
  /** Whether this driver recognized/handled the event. */
  handled: boolean;
  orderId?: string;
  providerRef?: string;
  status?: "paid" | "failed";
}

export interface PaymentService {
  readonly provider: PaymentProvider;
  /** Create a checkout session and return the URL to redirect the buyer to. */
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  /** Verify + interpret a provider webhook. Returns the order + new status. */
  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | undefined>,
  ): Promise<WebhookResult>;
}
