import type {
  Block,
  BlockType,
  ButtonProps,
  HeroProps,
  ImageProps,
  SectionProps,
  TextProps,
} from "@webforge/shared";
import { escapeHtml, escapeAttr, escapeMultiline, safeUrl } from "./escape.js";
import { alignItems, maxWidth, radius, rule, space, textAlign } from "./styles.js";

export interface Rendered {
  html: string;
  css: string;
}

interface RenderArgs<P> {
  cls: string;
  props: P;
  /** Pre-rendered HTML of child blocks (already escaped/safe). */
  childrenHtml: string;
}

type RendererFor<T extends BlockType> = (
  args: RenderArgs<Extract<Block, { type: T }>["props"]>,
) => Rendered;

const TEXT_SIZE: Record<TextProps["size"], string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.5rem",
  "2xl": "2rem",
  "3xl": "2.75rem",
};

const BTN_PAD: Record<ButtonProps["size"], string> = {
  sm: "0.4rem 0.9rem",
  md: "0.7rem 1.4rem",
  lg: "0.9rem 2rem",
};

function renderSection({ cls, props, childrenHtml }: RenderArgs<SectionProps>): Rendered {
  const css =
    rule(`.${cls}`, {
      background: props.bg,
      "padding-top": space(props.padding),
      "padding-bottom": space(props.padding),
    }) +
    rule(`.${cls} > .wf-inner`, {
      "max-width": maxWidth(props.maxWidth),
      margin: "0 auto",
      "padding-left": "var(--wf-space-sm)",
      "padding-right": "var(--wf-space-sm)",
      display: "flex",
      "flex-direction": props.direction,
      gap: space(props.gap),
      "align-items": props.direction === "column" ? alignItems(props.align) : "stretch",
      "justify-content": props.direction === "row" ? alignItems(props.align) : "flex-start",
      "text-align": textAlign(props.align),
    });
  const html = `<section class="${cls}"><div class="wf-inner">${childrenHtml}</div></section>`;
  return { html, css };
}

function renderHero({ cls, props }: RenderArgs<HeroProps>): Rendered {
  const css =
    rule(`.${cls}`, {
      background: props.bg,
      color: props.textColor,
      width: "100%",
      "border-radius": "var(--wf-radius-lg)",
      padding: "var(--wf-space-lg) var(--wf-space-md)",
      display: "flex",
      "flex-direction": "column",
      gap: "var(--wf-space-sm)",
      "align-items": alignItems(props.align),
      "text-align": textAlign(props.align),
    }) +
    rule(`.${cls} .wf-eyebrow`, {
      "text-transform": "uppercase",
      "letter-spacing": "0.08em",
      "font-size": "0.8rem",
      "font-weight": "600",
      color: "var(--wf-color-primary)",
      margin: "0",
    }) +
    rule(`.${cls} .wf-hero-title`, {
      "font-family": "var(--wf-font-heading)",
      "font-size": "clamp(2rem, 5vw, 3.5rem)",
      "line-height": "1.1",
      margin: "0",
    }) +
    rule(`.${cls} .wf-hero-subtitle`, {
      "font-size": "1.15rem",
      opacity: "0.85",
      margin: "0",
      "max-width": "44ch",
    }) +
    rule(`.${cls} .wf-hero-cta`, {
      "margin-top": "var(--wf-space-xs)",
      display: "inline-block",
      background: "var(--wf-color-primary)",
      color: "#fff",
      padding: "0.7rem 1.6rem",
      "border-radius": "var(--wf-radius-full)",
      "font-weight": "600",
      "text-decoration": "none",
    });

  const eyebrow = props.eyebrow
    ? `<p class="wf-eyebrow">${escapeHtml(props.eyebrow)}</p>`
    : "";
  const cta = props.ctaLabel
    ? `<a class="wf-hero-cta" href="${safeUrl(props.ctaHref)}">${escapeHtml(props.ctaLabel)}</a>`
    : "";
  const html =
    `<div class="${cls}">${eyebrow}` +
    `<h1 class="wf-hero-title">${escapeHtml(props.title)}</h1>` +
    `<p class="wf-hero-subtitle">${escapeHtml(props.subtitle)}</p>${cta}</div>`;
  return { html, css };
}

function renderText({ cls, props }: RenderArgs<TextProps>): Rendered {
  const css = rule(`.${cls}`, {
    color: props.color,
    "font-size": TEXT_SIZE[props.size],
    "line-height": "1.6",
    "text-align": textAlign(props.align),
    margin: "0",
    "max-width": "70ch",
  });
  const html = `<div class="${cls}">${escapeMultiline(props.content)}</div>`;
  return { html, css };
}

function renderImage({ cls, props }: RenderArgs<ImageProps>): Rendered {
  const margin =
    props.align === "left" ? "0 auto 0 0" : props.align === "right" ? "0 0 0 auto" : "0 auto";
  const css = rule(`.${cls}`, {
    display: "block",
    width: props.width,
    height: "auto",
    "border-radius": radius(props.radius),
    margin,
  });
  const html = `<img class="${cls}" src="${safeUrl(props.src)}" alt="${escapeAttr(props.alt)}" loading="lazy">`;
  return { html, css };
}

function renderButton({ cls, props }: RenderArgs<ButtonProps>): Rendered {
  const variant: Record<ButtonProps["variant"], Record<string, string>> = {
    solid: { background: "var(--wf-color-primary)", color: "#fff", border: "0" },
    outline: {
      background: "transparent",
      color: "var(--wf-color-primary)",
      border: "2px solid var(--wf-color-primary)",
    },
    ghost: { background: "transparent", color: "var(--wf-color-primary)", border: "0" },
  };
  const wrap = rule(`.${cls}-wrap`, {
    display: "flex",
    "justify-content": alignItems(props.align),
    width: "100%",
  });
  const css =
    wrap +
    rule(`.${cls}`, {
      display: "inline-block",
      padding: BTN_PAD[props.size],
      "border-radius": "var(--wf-radius-full)",
      "font-weight": "600",
      "text-decoration": "none",
      cursor: "pointer",
      ...variant[props.variant],
    });
  const html = `<div class="${cls}-wrap"><a class="${cls}" href="${safeUrl(props.href)}">${escapeHtml(props.label)}</a></div>`;
  return { html, css };
}

export const REGISTRY: { [T in BlockType]: RendererFor<T> } = {
  section: renderSection,
  hero: renderHero,
  text: renderText,
  image: renderImage,
  button: renderButton,
};
