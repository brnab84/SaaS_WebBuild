import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentService,
  WebhookResult,
} from "./PaymentService.js";

/** Real Mercado Pago Checkout Pro driver. Enabled by PAYMENT_DRIVER=mercadopago. */
export class MercadoPagoPaymentService implements PaymentService {
  readonly provider = "mercadopago" as const;
  private readonly client: MercadoPagoConfig;
  private readonly publicBaseUrl: string;

  constructor(accessToken: string, publicBaseUrl: string) {
    this.client = new MercadoPagoConfig({ accessToken });
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, "");
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const preference = new Preference(this.client);
    const res = await preference.create({
      body: {
        items: input.items.map((i, idx) => ({
          id: String(idx),
          title: i.title,
          quantity: i.quantity,
          unit_price: i.priceCents / 100,
          currency_id: input.currency,
        })),
        payer: { name: input.customer.name, email: input.customer.email },
        back_urls: {
          success: input.successUrl,
          failure: input.cancelUrl,
          pending: input.cancelUrl,
        },
        auto_return: "approved",
        // We reconcile the webhook back to our order via external_reference.
        external_reference: input.orderId,
        notification_url: `${this.publicBaseUrl}/api/payments/webhook`,
      },
    });
    return {
      url: res.init_point ?? input.cancelUrl,
      providerRef: String(res.id),
      provider: "mercadopago",
    };
  }

  async verifyWebhook(rawBody: Buffer): Promise<WebhookResult> {
    // MP posts { type: "payment", data: { id } }. We re-fetch the payment from
    // MP with our token (the source of truth), so a spoofed body can't mark an
    // order paid — the fetch authenticates and returns the real status.
    let body: { type?: string; data?: { id?: string | number } };
    try {
      body = JSON.parse(rawBody.toString() || "{}");
    } catch {
      return { handled: false };
    }
    if (body.type !== "payment" || body.data?.id == null) return { handled: false };

    const payment = await new Payment(this.client).get({ id: String(body.data.id) });
    return {
      handled: true,
      orderId: payment.external_reference ?? undefined,
      providerRef: String(body.data.id),
      status: payment.status === "approved" ? "paid" : "failed",
    };
  }
}
