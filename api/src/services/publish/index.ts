import { env } from "../../config/env.js";
import { LocalPublishService } from "./LocalPublishService.js";
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
    case "cloudflare-pages":
      // Phase 5: deploy static output to Cloudflare Pages + custom domains/SSL.
      throw new Error("PUBLISH_DRIVER=cloudflare-pages is not implemented yet (Phase 5).");
    default:
      throw new Error(`Unknown PUBLISH_DRIVER: ${env.PUBLISH_DRIVER}`);
  }
}

/** Process-wide singleton. The local impl also exposes read() for serving. */
export const publishService = createPublishService();
