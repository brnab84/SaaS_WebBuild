import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load the repo-root .env (api runs with cwd = api/). On Railway, env vars are
// injected directly and the file is simply absent — that's fine.
loadDotenv({ path: resolve(import.meta.dirname, "../../../.env") });
loadDotenv(); // also pick up a local api/.env if present

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),

  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/webforge"),
  MONGODB_DB_NAME: z.string().default("webforge"),

  JWT_ACCESS_SECRET: z.string().min(1).default("dev-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(1).default("dev-refresh-secret-change-me"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  // Email granted platform super-admin on register/login (the product owner).
  SUPER_ADMIN_EMAIL: z.string().email().optional(),

  // --- Email (EmailService) ---
  // `log` prints emails to the server log (no credentials). `resend` sends via
  // the Resend HTTP API.
  EMAIL_DRIVER: z.enum(["log", "resend"]).default("log"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("WebForge <onboarding@resend.dev>"),

  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./data/storage"),
  STORAGE_PUBLIC_PATH: z.string().default("/uploads"),

  PUBLISH_DRIVER: z.enum(["local", "r2"]).default("local"),
  PUBLISH_LOCAL_DIR: z.string().default("./data/published"),

  // --- Cloudflare R2 (Phase 5: productive storage + publishing) ---
  // Assets and published sites are uploaded to R2 (S3-compatible) and served by
  // Cloudflare's network with custom domains + automatic SSL.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(), // assets bucket
  R2_PUBLIC_URL: z.string().optional(), // public base URL for the assets bucket
  R2_PUBLISH_BUCKET: z.string().optional(), // published-sites bucket
  R2_PUBLISH_PUBLIC_URL: z.string().optional(), // public base URL for published sites

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),

  // --- Payments (Phase 3) ---
  // `mock` works with no credentials (local simulated checkout); the real
  // drivers need the matching keys below.
  PAYMENT_DRIVER: z.enum(["mock", "stripe", "mercadopago"]).default("mock"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Guardrail: never ship default secrets to production.
if (
  isProd &&
  (env.JWT_ACCESS_SECRET.includes("change-me") ||
    env.JWT_REFRESH_SECRET.includes("change-me"))
) {
  console.error("❌ Refusing to start in production with default JWT secrets.");
  process.exit(1);
}
