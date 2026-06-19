import { env } from "../../config/env.js";
import { createR2Client } from "../r2-client.js";
import { LocalPublishService } from "./LocalPublishService.js";
import { R2PublishService } from "./R2PublishService.js";
import type { PublishService } from "./PublishService.js";

export type {
  PublishService,
  PublishInput,
  PublishResult,
  PublishPageInput,
} from "./PublishService.js";
export { LocalPublishService } from "./LocalPublishService.js";

function createPublishService(): PublishService {
  switch (env.PUBLISH_DRIVER) {
    case "local":
      return new LocalPublishService({
        rootDir: env.PUBLISH_LOCAL_DIR,
        publicBaseUrl: env.PUBLIC_URL,
      });
    case "r2":
      // Productive publishing: render to static HTML in an R2 bucket served by
      // Cloudflare (custom domains + automatic SSL).
      if (!env.R2_PUBLISH_BUCKET || !env.R2_PUBLISH_PUBLIC_URL) {
        throw new Error("PUBLISH_DRIVER=r2 requires R2_PUBLISH_BUCKET and R2_PUBLISH_PUBLIC_URL");
      }
      return new R2PublishService(
        createR2Client(),
        env.R2_PUBLISH_BUCKET,
        env.R2_PUBLISH_PUBLIC_URL,
      );
    default:
      throw new Error(`Unknown PUBLISH_DRIVER: ${env.PUBLISH_DRIVER}`);
  }
}

/** Process-wide singleton. The local impl also exposes read() for serving. */
export const publishService = createPublishService();
