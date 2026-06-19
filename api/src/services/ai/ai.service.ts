import Anthropic from "@anthropic-ai/sdk";
import type { SiteDTO } from "@webforge/shared";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import { logger } from "../../utils/logger.js";
import { Page } from "../../models/Page.js";
import { Site } from "../../models/Site.js";
import { requireWorkspace } from "../access.service.js";
import { updateWorkspaceBrandKit } from "../brandkit.service.js";
import { toSiteDTO, uniqueSiteSlug } from "../site.service.js";
import { storageService } from "../storage/index.js";
import { buildSiteFromPlan } from "./buildSite.js";
import { monogramSvg } from "./logo.js";
import { aiSitePlanJsonSchema, aiSitePlanSchema, type AiSitePlan } from "./plan.schema.js";

const SYSTEM = `You are WebForge's site generator. From a business description, design a
complete, conversion-focused marketing website plan.

Rules:
- Pick a cohesive, on-brand color palette (7 hex colors) and a font pairing that fits the
  business — avoid generic defaults; do NOT default to Inter/Roboto or purple-on-white.
- Write concise, specific, benefit-led copy in the business's language. No lorem ipsum.
- Each page is an ordered list of blocks. Lead the home page with a hero (title + subtitle
  + a CTA), then alternate text sections, optional images, and buttons.
- Use only these block types: hero, text, image, button.
- Produce 1–3 pages; the first is the home page.`;

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new HttpError(
      501,
      "AI generation is not configured. Set ANTHROPIC_API_KEY to enable it.",
    );
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

const PLAN_TOOL: Anthropic.Tool = {
  name: "create_site_plan",
  description: "Return the structured website plan for the described business.",
  input_schema: aiSitePlanJsonSchema as unknown as Anthropic.Tool.InputSchema,
};

/**
 * Ask Claude for a site plan via a forced tool call (guarantees structured
 * output), then re-validate it with the zod schema. Forced tool_choice keeps
 * thinking off, which is fine for this bounded structured-generation task.
 */
export async function generateSitePlan(prompt: string): Promise<AiSitePlan> {
  const client = getClient();
  try {
    const message = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: [PLAN_TOOL],
      tool_choice: { type: "tool", name: PLAN_TOOL.name },
      messages: [
        { role: "user", content: `Business description:\n${prompt}\n\nDesign the website.` },
      ],
    });
    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new HttpError(502, "The AI did not return a usable site plan. Try again.");
    }
    return aiSitePlanSchema.parse(toolUse.input);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new HttpError(502, "AI provider rejected the API key.");
    }
    logger.error("AI generation failed", err);
    throw new HttpError(502, "AI generation failed. Please try again.");
  }
}

/**
 * Full Phase-2 flow: prompt → plan → create Site + Pages, update the workspace
 * BrandKit (palette/fonts) and generate a logo. Returns the new site.
 */
export async function generateSite(
  workspaceId: string,
  userId: string,
  input: { prompt: string; name?: string },
): Promise<SiteDTO> {
  await requireWorkspace(workspaceId, userId);

  const plan = await generateSitePlan(input.prompt);
  const built = buildSiteFromPlan(plan);
  const name = input.name?.trim() || built.siteName;

  const slug = await uniqueSiteSlug(name);
  const site = await Site.create({ workspace: workspaceId, name, slug });

  let homeId: typeof site._id | null = null;
  for (const page of built.pages) {
    const created = await Page.create({
      site: site._id,
      title: page.title,
      slug: page.slug,
      tree: page.tree,
      isHome: page.isHome,
    });
    if (page.isHome) homeId = created._id;
  }
  if (homeId) {
    site.homePage = homeId;
    await site.save();
  }

  // BrandKit: palette + fonts + generated logo.
  const primary = built.brand.colors?.primary ?? "#4f46e5";
  const headingFont = built.brand.fonts?.heading ?? "Poppins, sans-serif";
  const svg = monogramSvg(name, primary, headingFont);
  let logoUrl: string | null = null;
  try {
    const stored = await storageService.put(
      `${workspaceId}/logo-${Date.now()}.svg`,
      Buffer.from(svg, "utf8"),
      "image/svg+xml",
    );
    logoUrl = stored.url;
  } catch (err) {
    logger.warn("Logo generation/storage failed (continuing)", err);
  }

  await updateWorkspaceBrandKit(workspaceId, userId, {
    ...built.brand,
    ...(logoUrl ? { logo: logoUrl } : {}),
  });

  return toSiteDTO(site);
}
