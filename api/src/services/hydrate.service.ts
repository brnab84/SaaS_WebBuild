import type { Block, EventLite, ProductLite } from "@webforge/shared";
import { Event } from "../models/Event.js";
import { Product } from "../models/Product.js";

/**
 * Inject live data into dynamic blocks (products/events) before rendering, so
 * the renderer stays pure. Returns a hydrated clone — the stored tree is never
 * mutated. Form blocks need no data (they post to the API via the bootstrap).
 */
export async function hydrateTree(
  tree: Block,
  ctx: { workspaceId: string; siteId: string },
): Promise<Block> {
  let needsProducts = false;
  let needsEvents = false;
  const scan = (n: Block) => {
    if (n.type === "products") needsProducts = true;
    if (n.type === "events") needsEvents = true;
    n.children.forEach(scan);
  };
  scan(tree);
  if (!needsProducts && !needsEvents) return tree;

  const [products, events] = await Promise.all([
    needsProducts
      ? Product.find({ workspace: ctx.workspaceId, active: true }).sort({ createdAt: -1 }).limit(48).lean()
      : [],
    needsEvents
      ? Event.find({ workspace: ctx.workspaceId }).sort({ startsAt: 1 }).limit(48).lean()
      : [],
  ]);

  const productLites: ProductLite[] = products.map((p) => ({
    id: p._id.toString(),
    title: p.title,
    priceCents: p.priceCents,
    currency: p.currency,
    image: p.images?.[0] ?? null,
  }));
  const eventLites: EventLite[] = events.map((e) => {
    const going = (e.rsvps ?? [])
      .filter((r) => r.status === "going")
      .reduce((n, r) => n + r.guests, 0);
    return {
      id: e._id.toString(),
      title: e.title,
      startsAt: new Date(e.startsAt).toISOString(),
      location: e.location,
      spotsLeft: e.capacity != null ? Math.max(0, e.capacity - going) : null,
    };
  });

  const clone = structuredClone(tree);
  const inject = (n: Block) => {
    if (n.type === "products") n.props._items = productLites.slice(0, n.props.limit);
    if (n.type === "events") n.props._items = eventLites.slice(0, n.props.limit);
    n.children.forEach(inject);
  };
  inject(clone);
  return clone;
}
