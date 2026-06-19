/**
 * StorageService — abstraction over asset storage.
 *
 * MVP ships a local-disk implementation. Phase 5 swaps in a Cloudflare R2
 * implementation behind this same interface; nothing else in the app changes.
 */
export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageService {
  /** Store bytes under `key` and return its public addressing. */
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  /** Fetch bytes for `key`, or null if absent. */
  get(key: string): Promise<Buffer | null>;
  /** Remove the object (no-op if it doesn't exist). */
  remove(key: string): Promise<void>;
  /** Public URL at which `key` is served. */
  url(key: string): string;
}
