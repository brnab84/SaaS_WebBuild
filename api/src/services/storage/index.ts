import { env } from "../../config/env.js";
import { LocalStorageService } from "./LocalStorageService.js";
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
      // Phase 5: return new R2StorageService(...). Interface is identical.
      throw new Error("STORAGE_DRIVER=r2 is not implemented yet (Phase 5).");
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

/** Process-wide singleton. */
export const storageService: StorageService = createStorageService();
