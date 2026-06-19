import type { Align, Size } from "@webforge/shared";
import { cssValue } from "./escape.js";

/** Resolve a spacing size to a BrandKit token reference (or 0 for "none"). */
export function space(size: Size): string {
  return size === "none" ? "0" : `var(--wf-space-${size})`;
}

/** Resolve a radius size to a BrandKit token reference. */
export function radius(size: Size): string {
  return size === "none" ? "0" : `var(--wf-radius-${size})`;
}

export function textAlign(align: Align): string {
  return align;
}

/** For flex containers: map text alignment to the cross-axis item alignment. */
export function alignItems(align: Align): string {
  return align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
}

export function maxWidth(kind: "full" | "narrow" | "default" | "wide"): string {
  switch (kind) {
    case "full":
      return "100%";
    case "narrow":
      return "680px";
    case "wide":
      return "1400px";
    default:
      return "1120px";
  }
}

/** Serialize a declaration map into a CSS rule body, guarding every value. */
export function declarations(map: Record<string, string | undefined>): string {
  return Object.entries(map)
    .filter((entry): entry is [string, string] => entry[1] != null && entry[1] !== "")
    .map(([prop, value]) => `${prop}:${cssValue(value)}`)
    .join(";");
}

/** Build a full CSS rule: `selector{decls}`. Returns "" when there are no decls. */
export function rule(selector: string, map: Record<string, string | undefined>): string {
  const body = declarations(map);
  return body ? `${selector}{${body}}` : "";
}
