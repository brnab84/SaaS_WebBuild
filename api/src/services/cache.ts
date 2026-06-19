/**
 * In-memory cache of published page HTML, keyed by `${siteSlug}/${pageSlug}`.
 * Populated on publish and cleared on (re)publish/unpublish — see spec:
 * "cache en memoria del árbol de página publicada (invalidar al publicar)".
 *
 * Single-process MVP; in a multi-instance deploy this becomes Redis behind the
 * same tiny interface.
 */
class PublishedCache {
  private store = new Map<string, string>();

  private key(siteSlug: string, pageSlug: string): string {
    return `${siteSlug}/${pageSlug}`;
  }

  get(siteSlug: string, pageSlug: string): string | undefined {
    return this.store.get(this.key(siteSlug, pageSlug));
  }

  set(siteSlug: string, pageSlug: string, html: string): void {
    this.store.set(this.key(siteSlug, pageSlug), html);
  }

  /** Drop every cached page for a site (called on publish + unpublish). */
  invalidateSite(siteSlug: string): void {
    const prefix = `${siteSlug}/`;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const publishedCache = new PublishedCache();
