import { z } from "zod";

/**
 * The AI returns a FLAT site plan (not the recursive block tree — structured
 * outputs don't support recursive schemas). We then build a valid block tree
 * from this plan with `makeBlock`, so the model can never produce an invalid
 * tree. Keep this schema simple and tolerant.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const aiBlockSchema = z.object({
  type: z.enum(["hero", "text", "image", "button"]),
  // hero
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  // text
  content: z.string().optional(),
  size: z.enum(["sm", "md", "lg", "xl", "2xl", "3xl"]).optional(),
  // image
  alt: z.string().optional(),
  // button
  label: z.string().optional(),
  href: z.string().optional(),
  variant: z.enum(["solid", "outline", "ghost"]).optional(),
  // shared
  align: z.enum(["left", "center", "right"]).optional(),
});
export type AiBlock = z.infer<typeof aiBlockSchema>;

export const aiPageSchema = z.object({
  title: z.string(),
  slug: z.string(),
  blocks: z.array(aiBlockSchema),
});
export type AiPage = z.infer<typeof aiPageSchema>;

export const aiSitePlanSchema = z.object({
  siteName: z.string(),
  brand: z.object({
    colors: z.object({
      primary: hex,
      secondary: hex,
      accent: hex,
      bg: hex,
      surface: hex,
      text: hex,
      muted: hex,
    }),
    fonts: z.object({
      heading: z.string(),
      body: z.string(),
      googleFonts: z.array(z.string()),
    }),
  }),
  pages: z.array(aiPageSchema),
});
export type AiSitePlan = z.infer<typeof aiSitePlanSchema>;

/**
 * Equivalent JSON Schema for the Anthropic tool's `input_schema` (the model is
 * forced to call the tool, guaranteeing a structured result we then re-validate
 * with the zod schema above). Hand-written to stay independent of the zod major
 * version used elsewhere in the monorepo.
 */
const colorProps = ["primary", "secondary", "accent", "bg", "surface", "text", "muted"];

export const aiSitePlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    siteName: { type: "string", description: "Short brand/site name" },
    brand: {
      type: "object",
      additionalProperties: false,
      properties: {
        colors: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(
            colorProps.map((c) => [c, { type: "string", description: "hex color #rrggbb" }]),
          ),
          required: colorProps,
        },
        fonts: {
          type: "object",
          additionalProperties: false,
          properties: {
            heading: { type: "string" },
            body: { type: "string" },
            googleFonts: { type: "array", items: { type: "string" } },
          },
          required: ["heading", "body", "googleFonts"],
        },
      },
      required: ["colors", "fonts"],
    },
    pages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          slug: { type: "string" },
          blocks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string", enum: ["hero", "text", "image", "button"] },
                eyebrow: { type: "string" },
                title: { type: "string" },
                subtitle: { type: "string" },
                ctaLabel: { type: "string" },
                ctaHref: { type: "string" },
                content: { type: "string" },
                size: { type: "string", enum: ["sm", "md", "lg", "xl", "2xl", "3xl"] },
                alt: { type: "string" },
                label: { type: "string" },
                href: { type: "string" },
                variant: { type: "string", enum: ["solid", "outline", "ghost"] },
                align: { type: "string", enum: ["left", "center", "right"] },
              },
              required: ["type"],
            },
          },
        },
        required: ["title", "slug", "blocks"],
      },
    },
  },
  required: ["siteName", "brand", "pages"],
} as const;
