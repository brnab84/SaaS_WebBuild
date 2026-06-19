import { z } from "zod";

/**
 * Design tokens (BrandKit).
 *
 * The BrandKit is the single source of truth for a workspace's visual identity.
 * Tokens are serialized into CSS custom properties (`--wf-*`) by the renderer,
 * so any block prop that references e.g. `var(--wf-color-primary)` automatically
 * propagates when the token changes. Change a color once → it updates everywhere.
 */

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Must be a hex color");

export const brandColorsSchema = z.object({
  primary: hexColor,
  secondary: hexColor,
  accent: hexColor,
  bg: hexColor,
  surface: hexColor,
  text: hexColor,
  muted: hexColor,
});
export type BrandColors = z.infer<typeof brandColorsSchema>;

export const brandFontsSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  /** Optional Google Fonts family names to load, e.g. ["Inter", "Poppins"]. */
  googleFonts: z.array(z.string()).default([]),
});
export type BrandFonts = z.infer<typeof brandFontsSchema>;

/** Spacing scale (CSS lengths) keyed by t-shirt size. Drives `padding`/`gap` props. */
export const spacingScaleSchema = z.object({
  none: z.string().default("0"),
  xs: z.string().default("0.5rem"),
  sm: z.string().default("1rem"),
  md: z.string().default("2rem"),
  lg: z.string().default("4rem"),
  xl: z.string().default("8rem"),
});
export type SpacingScale = z.infer<typeof spacingScaleSchema>;

export const radiusScaleSchema = z.object({
  none: z.string().default("0"),
  sm: z.string().default("4px"),
  md: z.string().default("8px"),
  lg: z.string().default("16px"),
  full: z.string().default("9999px"),
});
export type RadiusScale = z.infer<typeof radiusScaleSchema>;

export const brandKitSchema = z.object({
  name: z.string().default("Default brand"),
  colors: brandColorsSchema,
  fonts: brandFontsSchema,
  spacing: spacingScaleSchema,
  radius: radiusScaleSchema,
  /** Asset id / URL of the logo (optional in MVP). */
  logo: z.string().nullable().default(null),
});
export type BrandKit = z.infer<typeof brandKitSchema>;

/** A sensible default BrandKit used when a workspace is created. */
export const defaultBrandKit: BrandKit = {
  name: "Default brand",
  colors: {
    primary: "#4f46e5",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    bg: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    muted: "#64748b",
  },
  fonts: {
    heading: "Poppins, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
    googleFonts: ["Inter", "Poppins"],
  },
  spacing: { none: "0", xs: "0.5rem", sm: "1rem", md: "2rem", lg: "4rem", xl: "8rem" },
  radius: { none: "0", sm: "4px", md: "8px", lg: "16px", full: "9999px" },
  logo: null,
};

/**
 * Flatten a BrandKit into the CSS custom properties map (`--wf-*` → value).
 * Shared so the editor and the renderer produce identical variable names.
 */
export function brandKitToCssVars(kit: BrandKit): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(kit.colors)) vars[`--wf-color-${k}`] = v;
  vars["--wf-font-heading"] = kit.fonts.heading;
  vars["--wf-font-body"] = kit.fonts.body;
  for (const [k, v] of Object.entries(kit.spacing)) vars[`--wf-space-${k}`] = v;
  for (const [k, v] of Object.entries(kit.radius)) vars[`--wf-radius-${k}`] = v;
  return vars;
}

/** Token reference helpers, so blocks/editor never hard-code variable names. */
export const token = {
  color: (k: keyof BrandColors) => `var(--wf-color-${k})`,
  space: (k: keyof SpacingScale) => `var(--wf-space-${k})`,
  radius: (k: keyof RadiusScale) => `var(--wf-radius-${k})`,
  fontHeading: () => "var(--wf-font-heading)",
  fontBody: () => "var(--wf-font-body)",
} as const;
