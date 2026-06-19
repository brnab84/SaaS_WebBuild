import type { Block, BrandKit } from "@webforge/shared";

/**
 * PublishService — abstraction over where/how a site's static output goes.
 *
 * MVP: LocalPublishService writes static HTML to disk, served by this Express
 * app at /s/:siteSlug. Phase 5: a CloudflarePagesPublishService implements the
 * same interface (deploy to Pages, custom domains, SSL) with no caller changes.
 */
export interface PublishPageInput {
  slug: string;
  title: string;
  tree: Block;
  isHome: boolean;
}

export interface PublishInput {
  site: { slug: string; name: string; id: string };
  brandKit: BrandKit;
  pages: PublishPageInput[];
  /** Public API origin used by dynamic blocks in the published HTML. */
  apiBase: string;
}

export interface PublishResult {
  url: string;
  pages: number;
  publishedAt: Date;
}

export interface PublishService {
  publish(input: PublishInput): Promise<PublishResult>;
  unpublish(siteSlug: string): Promise<void>;
  /**
   * Optional: read a published page's HTML for in-app serving (cache-first).
   * Implemented by drivers that serve through this app (local). Drivers that
   * deploy elsewhere (Cloudflare Pages) serve directly and may omit it.
   */
  read?(siteSlug: string, pageSlug: string): Promise<string | null>;
}
