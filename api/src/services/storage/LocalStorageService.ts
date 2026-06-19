import { promises as fs } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import type { StorageService, StoredObject } from "./StorageService.js";

/**
 * Disk-backed StorageService for the MVP. Objects live under `rootDir` and are
 * served statically by the Express app under `publicPath`.
 */
export class LocalStorageService implements StorageService {
  private readonly rootDir: string;
  private readonly publicPath: string;
  private readonly publicBaseUrl: string;

  constructor(opts: { rootDir: string; publicPath: string; publicBaseUrl: string }) {
    this.rootDir = resolve(opts.rootDir);
    this.publicPath = opts.publicPath.replace(/\/$/, "");
    this.publicBaseUrl = opts.publicBaseUrl.replace(/\/$/, "");
  }

  /** Local on-disk directory that the static middleware should serve. */
  get directory(): string {
    return this.rootDir;
  }
  get mountPath(): string {
    return this.publicPath;
  }

  private safePath(key: string): string {
    // Prevent path traversal: resolve and ensure it stays under rootDir.
    const target = resolve(this.rootDir, key.replace(/^\/+/, ""));
    if (target !== this.rootDir && !target.startsWith(this.rootDir + sep)) {
      throw new Error("Invalid storage key");
    }
    return target;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const target = this.safePath(key);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    return { key, url: this.url(key), size: data.byteLength, contentType };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.safePath(key));
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.safePath(key));
    } catch {
      /* ignore missing */
    }
  }

  url(key: string): string {
    return `${this.publicBaseUrl}${this.publicPath}/${key.replace(/^\/+/, "")}`;
  }

  // Kept for symmetry/readability with join import used elsewhere.
  static keyFor(workspaceId: string, filename: string): string {
    return join(workspaceId, `${Date.now()}-${filename}`).replace(/\\/g, "/");
  }
}
