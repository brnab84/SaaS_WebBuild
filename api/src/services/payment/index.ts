import { env } from "../../config/env.js";
import { MockPaymentService } from "./MockPaymentService.js";
import { StripePaymentService } from "./StripePaymentService.js";
import { MercadoPagoPaymentService } from "./MercadoPagoPaymentService.js";
import type { PaymentService } from "./PaymentService.js";

export type {
  PaymentService,
  CheckoutSession,
  CreateCheckoutInput,
  CheckoutLineItem,
  WebhookResult,
} from "./PaymentService.js";

function createPaymentService(): PaymentService {
  switch (env.PAYMENT_DRIVER) {
    case "mock":
      return new MockPaymentService(env.PUBLIC_URL);
    case "stripe":
      if (!env.STRIPE_SECRET_KEY) {
        throw new Error("PAYMENT_DRIVER=stripe requires STRIPE_SECRET_KEY");
      }
      return new StripePaymentService(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET);
    case "mercadopago":
      if (!env.MERCADOPAGO_ACCESS_TOKEN) {
        throw new Error("PAYMENT_DRIVER=mercadopago requires MERCADOPAGO_ACCESS_TOKEN");
      }
      return new MercadoPagoPaymentService(env.MERCADOPAGO_ACCESS_TOKEN, env.PUBLIC_URL);
    default:
      throw new Error(`Unknown PAYMENT_DRIVER: ${env.PAYMENT_DRIVER}`);
  }
}

/** Process-wide singleton. */
export const paymentService: PaymentService = createPaymentService();
