import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { renderDocument } from "@webforge/renderer";
import type { PublishInput, PublishResult, PublishService } from "./PublishService.js";

/**
 * Productive publishing to Cloudflare R2 (Phase 5). Renders each page to static
 * HTML and uploads it under `<siteSlug>/...`; Cloudflare serves the bucket with
 * custom domains + automatic SSL. (No `read()` — serving happens at Cloudflare,
 * not through this app.)
 */
export class R2PublishService implements PublishService {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
  ) {}

  async publish(input: PublishInput): Promise<PublishResult> {
    const { site, brandKit, pages } = input;
    await this.deletePrefix(`${site.slug}/`);

    for (const page of pages) {
      const html = renderDocument({
        page: { title: page.title, tree: page.tree },
        site: { name: site.name },
        brandKit,
      });
      const fileSlug = page.isHome ? "index" : page.slug;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: `${site.slug}/${fileSlug}.html`,
          Body: html,
          ContentType: "text/html; charset=utf-8",
        }),
      );
    }

    return {
      url: `${this.publicBaseUrl.replace(/\/$/, "")}/${site.slug}/`,
      pages: pages.length,
      publishedAt: new Date(),
    };
  }

  async unpublish(siteSlug: string): Promise<void> {
    await this.deletePrefix(`${siteSlug}/`);
  }

  private async deletePrefix(prefix: string): Promise<void> {
    const list = await this.s3.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );
    for (const obj of list.Contents ?? []) {
      if (obj.Key) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: obj.Key }));
      }
    }
  }
}
