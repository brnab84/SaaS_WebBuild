import Stripe from "stripe";
import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentService,
  WebhookResult,
} from "./PaymentService.js";

/** Real Stripe Checkout driver. Enabled by PAYMENT_DRIVER=stripe + keys. */
export class StripePaymentService implements PaymentService {
  readonly provider = "stripe" as const;
  private readonly stripe: Stripe;
  private readonly webhookSecret?: string;

  constructor(secretKey: string, webhookSecret?: string) {
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customer.email,
      line_items: input.items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: i.priceCents,
          product_data: { name: i.title },
        },
      })),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // We reconcile the webhook back to our order via metadata.
      metadata: { orderId: input.orderId },
    });
    return { url: session.url ?? input.cancelUrl, providerRef: session.id, provider: "stripe" };
  }

  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | undefined>,
  ): Promise<WebhookResult> {
    const sig = headers["stripe-signature"];
    if (!sig || !this.webhookSecret) return { handled: false };
    const event = this.stripe.webhooks.constructEvent(rawBody, sig, this.webhookSecret);
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      return {
        handled: true,
        orderId: s.metadata?.orderId,
        providerRef: s.id,
        status: s.payment_status === "paid" ? "paid" : "failed",
      };
    }
    return { handled: true };
  }
}
