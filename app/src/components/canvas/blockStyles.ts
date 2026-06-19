import type { CSSProperties } from "react";
import type { Block, Size } from "@webforge/shared";

/** Map a spacing size key to its BrandKit token reference. */
export const space = (s: Size): string => (s === "none" ? "0" : `var(--wf-space-${s})`);
export const radius = (s: Size): string => (s === "none" ? "0" : `var(--wf-radius-${s})`);

export const alignItems = (a: "left" | "center" | "right"): string =>
  a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";

export const maxWidth = (k: "full" | "narrow" | "default" | "wide"): string =>
  k === "full" ? "100%" : k === "narrow" ? "680px" : k === "wide" ? "1400px" : "1120px";

const TEXT_SIZE: Record<string, string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.5rem",
  "2xl": "2rem",
  "3xl": "2.75rem",
};
export const textSize = (s: string): string => TEXT_SIZE[s] ?? "1rem";

const BTN_PAD: Record<string, string> = {
  sm: "0.4rem 0.9rem",
  md: "0.7rem 1.4rem",
  lg: "0.9rem 2rem",
};
export const buttonPad = (s: string): string => BTN_PAD[s] ?? BTN_PAD.md!;

/** Compute the outer style for a block type (mirrors the renderer's output). */
export function blockStyle(block: Block): CSSProperties {
  switch (block.type) {
    case "section": {
      const p = block.props;
      return {
        background: p.bg,
        paddingTop: space(p.padding),
        paddingBottom: space(p.padding),
      };
    }
    case "hero": {
      const p = block.props;
      return {
        background: p.bg,
        color: p.textColor,
        width: "100%",
        borderRadius: "var(--wf-radius-lg)",
        padding: "var(--wf-space-lg) var(--wf-space-md)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--wf-space-sm)",
        alignItems: alignItems(p.align),
        textAlign: p.align,
      };
    }
    case "text": {
      const p = block.props;
      return {
        color: p.color,
        fontSize: textSize(p.size),
        lineHeight: 1.6,
        textAlign: p.align,
        maxWidth: "70ch",
        whiteSpace: "pre-wrap",
      };
    }
    case "image": {
      const p = block.props;
      return {
        display: "block",
        width: p.width,
        height: "auto",
        borderRadius: radius(p.radius),
        margin: p.align === "left" ? "0 auto 0 0" : p.align === "right" ? "0 0 0 auto" : "0 auto",
      };
    }
    case "button": {
      const p = block.props;
      const variant: Record<string, CSSProperties> = {
        solid: { background: "var(--wf-color-primary)", color: "#fff" },
        outline: {
          background: "transparent",
          color: "var(--wf-color-primary)",
          border: "2px solid var(--wf-color-primary)",
        },
        ghost: { background: "transparent", color: "var(--wf-color-primary)" },
      };
      return {
        display: "inline-block",
        padding: buttonPad(p.size),
        borderRadius: "var(--wf-radius-full)",
        fontWeight: 600,
        ...variant[p.variant],
      };
    }
    default:
      return {};
  }
}

/** Inner container style for a section's children list. */
export function sectionInnerStyle(block: Block): CSSProperties {
  if (block.type !== "section") return {};
  const p = block.props;
  return {
    maxWidth: maxWidth(p.maxWidth),
    margin: "0 auto",
    paddingLeft: "var(--wf-space-sm)",
    paddingRight: "var(--wf-space-sm)",
    display: "flex",
    flexDirection: p.direction,
    gap: space(p.gap),
    alignItems: p.direction === "column" ? alignItems(p.align) : "stretch",
    justifyContent: p.direction === "row" ? alignItems(p.align) : "flex-start",
    textAlign: p.align,
    minHeight: block.children.length === 0 ? "80px" : undefined,
  };
}
