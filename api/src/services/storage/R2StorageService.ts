import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { stripLeadingSlashes } from "../r2-client.js";
import type { StorageService, StoredObject } from "./StorageService.js";

/**
 * Cloudflare R2 asset storage (S3-compatible). Objects are served by Cloudflare
 * from the bucket's public URL — same `StorageService` interface as local disk.
 */
export class R2StorageService implements StorageService {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
  ) {}

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: stripLeadingSlashes(key),
        Body: data,
        ContentType: contentType,
      }),
    );
    return { key, url: this.url(key), size: data.byteLength, contentType };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: stripLeadingSlashes(key) }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await this.s3
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: stripLeadingSlashes(key) }))
      .catch(() => undefined);
  }

  url(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${stripLeadingSlashes(key)}`;
  }
}
