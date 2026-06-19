import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentService,
  WebhookResult,
} from "./PaymentService.js";

/**
 * Local simulated checkout — no credentials required. `createCheckout` returns
 * a URL to an in-app page (served by this Express app) with a "Pay" button that
 * confirms the order. Lets the whole commerce flow be exercised in dev/tests.
 */
export class MockPaymentService implements PaymentService {
  readonly provider = "mock" as const;
  private readonly baseUrl: string;

  constructor(publicBaseUrl: string) {
    this.baseUrl = publicBaseUrl.replace(/\/$/, "");
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    return {
      url: `${this.baseUrl}/checkout/mock/${input.orderId}`,
      providerRef: `mock_${input.orderId}`,
      provider: "mock",
    };
  }

  // The mock confirms via a dedicated in-app route, not a provider webhook.
  async verifyWebhook(): Promise<WebhookResult> {
    return { handled: false };
  }
}
