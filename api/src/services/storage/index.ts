import { env } from "../../config/env.js";
import { createR2Client } from "../r2-client.js";
import { LocalStorageService } from "./LocalStorageService.js";
import { R2StorageService } from "./R2StorageService.js";
import type { StorageService } from "./StorageService.js";

export type { StorageService, StoredObject } from "./StorageService.js";
export { LocalStorageService } from "./LocalStorageService.js";

/** Build the StorageService selected by STORAGE_DRIVER. */
function createStorageService(): StorageService {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return new LocalStorageService({
        rootDir: env.STORAGE_LOCAL_DIR,
        publicPath: env.STORAGE_PUBLIC_PATH,
        publicBaseUrl: env.PUBLIC_URL,
      });
    case "r2":
      if (!env.R2_BUCKET || !env.R2_PUBLIC_URL) {
        throw new Error("STORAGE_DRIVER=r2 requires R2_BUCKET and R2_PUBLIC_URL");
      }
      return new R2StorageService(createR2Client(), env.R2_BUCKET, env.R2_PUBLIC_URL);
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

/** Process-wide singleton. */
export const storageService: StorageService = createStorageService();
