import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * EmailService — abstraction over transactional email (same migration-seam
 * pattern as payments/storage). `log` prints to the server log (no creds);
 * `resend` sends via the Resend HTTP API. Sends are best-effort: a failure is
 * logged, never thrown into the request path.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  send(msg: EmailMessage): Promise<void>;
}

class LogEmailService implements EmailService {
  async send(msg: EmailMessage): Promise<void> {
    logger.info(`[email:log] → ${msg.to} | ${msg.subject}`, msg.text ?? msg.html.slice(0, 200));
  }
}

class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    }
  }
}

function createEmailService(): EmailService {
  if (env.EMAIL_DRIVER === "resend") {
    if (!env.RESEND_API_KEY) throw new Error("EMAIL_DRIVER=resend requires RESEND_API_KEY");
    return new ResendEmailService(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new LogEmailService();
}

const emailService = createEmailService();

/** Send an email, swallowing errors (transactional sends never break a request). */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  try {
    await emailService.send(msg);
  } catch (err) {
    logger.error("Email send failed", err);
  }
}
