import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

/** Build an S3 client pointed at Cloudflare R2 (S3-compatible API). */
export function createR2Client(): S3Client {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 driver requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY",
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

export const stripLeadingSlashes = (key: string): string => key.replace(/^\/+/, "");
