import type {
  Block,
  BlockType,
  ButtonProps,
  EventsProps,
  FormProps,
  HeroProps,
  ImageProps,
  ProductsProps,
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

const money = (cents: number, currency: string): string =>
  `${currency} ${(cents / 100).toFixed(2)}`;

/** Shared CSS for a dynamic block's heading (`.wf-h` title + `.wf-sub` subtitle). */
function sectionHeading(cls: string): string {
  return (
    rule(`.${cls} .wf-h`, {
      "font-family": "var(--wf-font-heading)",
      "font-size": "clamp(1.6rem, 4vw, 2.4rem)",
      margin: "0",
    }) +
    rule(`.${cls} .wf-sub`, { color: "var(--wf-color-muted)", margin: "0.25rem 0 0", "max-width": "55ch" })
  );
}

function renderProducts({ cls, props }: RenderArgs<ProductsProps>): Rendered {
  const items = props._items ?? [];
  const cols = props.columns;
  const css =
    rule(`.${cls}`, {
      width: "100%",
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "text-align": "center",
    }) +
    sectionHeading(cls) +
    rule(`.${cls} .wf-grid`, {
      display: "grid",
      width: "100%",
      "grid-template-columns": `repeat(${cols}, minmax(0, 1fr))`,
      gap: "var(--wf-space-sm)",
      "margin-top": "var(--wf-space-md)",
    }) +
    rule(`.${cls} .wf-card`, {
      border: "1px solid #e2e8f0",
      "border-radius": "var(--wf-radius-md)",
      overflow: "hidden",
      background: "var(--wf-color-surface)",
      display: "flex",
      "flex-direction": "column",
      "text-align": "left",
    }) +
    rule(`.${cls} .wf-card img`, { width: "100%", "aspect-ratio": "4/3", "object-fit": "cover" }) +
    rule(`.${cls} .wf-card .wf-b`, {
      padding: "var(--wf-space-sm)",
      display: "flex",
      "flex-direction": "column",
      gap: "6px",
      flex: "1",
    }) +
    rule(`.${cls} .wf-price`, { "font-weight": "700", color: "var(--wf-color-primary)" }) +
    rule(`.${cls} .wf-buy`, {
      "margin-top": "auto",
      background: "var(--wf-color-primary)",
      color: "#fff",
      border: "0",
      padding: "0.6rem 1rem",
      "border-radius": "var(--wf-radius-full)",
      "font-weight": "600",
      cursor: "pointer",
    });

  const cards = items
    .map(
      (it) =>
        `<div class="wf-card">` +
        (it.image ? `<img src="${safeUrl(it.image)}" alt="${escapeAttr(it.title)}" loading="lazy">` : "") +
        `<div class="wf-b"><strong>${escapeHtml(it.title)}</strong>` +
        `<span class="wf-price">${escapeHtml(money(it.priceCents, it.currency))}</span>` +
        `<button class="wf-buy" type="button" data-pid="${escapeAttr(it.id)}">Buy now</button>` +
        `</div></div>`,
    )
    .join("");
  const body = items.length
    ? `<div class="wf-grid">${cards}</div>`
    : `<p class="wf-sub">No products yet.</p>`;

  const heading =
    `<h2 class="wf-h">${escapeHtml(props.title)}</h2>` +
    (props.subtitle ? `<p class="wf-sub">${escapeHtml(props.subtitle)}</p>` : "");
  const script =
    `<script>(function(){var W=window.__WF||{};document.querySelectorAll(${JSON.stringify(
      `.${cls} .wf-buy`,
    )}).forEach(function(b){b.addEventListener('click',async function(){var em=prompt('Your email for the order:');if(!em)return;b.disabled=true;try{var r=await fetch(W.apiBase+'/api/storefront/'+W.siteId+'/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:[{productId:b.getAttribute('data-pid'),quantity:1}],customer:{name:em,email:em}})});var d=await r.json();if(d.checkoutUrl){location.href=d.checkoutUrl;}else{alert(d.error||'Checkout failed');b.disabled=false;}}catch(e){alert('Checkout failed');b.disabled=false;}});});})();</script>`;
  return { html: `<div class="${cls}">${heading}${body}</div>${script}`, css };
}

function renderEvents({ cls, props }: RenderArgs<EventsProps>): Rendered {
  const items = props._items ?? [];
  const css =
    rule(`.${cls}`, { width: "100%", display: "flex", "flex-direction": "column", "align-items": "center", "text-align": "center" }) +
    sectionHeading(cls) +
    rule(`.${cls} .wf-list`, { display: "flex", "flex-direction": "column", gap: "var(--wf-space-sm)", width: "100%", "max-width": "680px", "margin-top": "var(--wf-space-md)" }) +
    rule(`.${cls} .wf-ev`, { border: "1px solid #e2e8f0", "border-radius": "var(--wf-radius-md)", padding: "var(--wf-space-sm)", background: "var(--wf-color-surface)", "text-align": "left" }) +
    rule(`.${cls} .wf-when`, { color: "var(--wf-color-muted)", "font-size": "0.9rem" }) +
    rule(`.${cls} .wf-rsvp`, { display: "flex", "flex-wrap": "wrap", gap: "6px", "margin-top": "0.5rem" }) +
    rule(`.${cls} .wf-rsvp input`, { flex: "1", "min-width": "120px", padding: "0.5rem", border: "1px solid #cbd5e1", "border-radius": "var(--wf-radius-sm)" }) +
    rule(`.${cls} .wf-rsvp button`, { background: "var(--wf-color-primary)", color: "#fff", border: "0", padding: "0.5rem 1rem", "border-radius": "var(--wf-radius-full)", "font-weight": "600", cursor: "pointer" }) +
    rule(`.${cls} .wf-msg`, { "margin-top": "0.4rem", color: "var(--wf-color-primary)", "font-size": "0.9rem" });

  const list = items
    .map((ev) => {
      const when =
        escapeHtml(new Date(ev.startsAt).toUTCString().replace(/ GMT$/, "")) +
        (ev.location ? ` · ${escapeHtml(ev.location)}` : "");
      const spots = ev.spotsLeft != null ? ` · ${ev.spotsLeft} spot(s) left` : "";
      return (
        `<div class="wf-ev"><strong>${escapeHtml(ev.title)}</strong>` +
        `<div class="wf-when">${when}${escapeHtml(spots)}</div>` +
        `<form class="wf-rsvp" data-eid="${escapeAttr(ev.id)}">` +
        `<input name="name" placeholder="Name" required><input name="email" type="email" placeholder="Email" required>` +
        `<button type="submit">RSVP</button></form><p class="wf-msg" hidden></p></div>`
      );
    })
    .join("");
  const body = items.length
    ? `<div class="wf-list">${list}</div>`
    : `<p class="wf-sub">No upcoming events.</p>`;
  const heading =
    `<h2 class="wf-h">${escapeHtml(props.title)}</h2>` +
    (props.subtitle ? `<p class="wf-sub">${escapeHtml(props.subtitle)}</p>` : "");
  const script =
    `<script>(function(){var W=window.__WF||{};document.querySelectorAll(${JSON.stringify(
      `.${cls} .wf-rsvp`,
    )}).forEach(function(f){f.addEventListener('submit',async function(e){e.preventDefault();var msg=f.parentNode.querySelector('.wf-msg');var body={name:f.name.value,email:f.email.value,guests:1,status:'going'};try{var r=await fetch(W.apiBase+'/api/storefront/events/'+f.getAttribute('data-eid')+'/rsvp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});var d=await r.json();msg.hidden=false;msg.textContent=r.ok?'You are on the list!':(d.error||'Could not RSVP');if(r.ok)f.reset();}catch(err){msg.hidden=false;msg.textContent='Could not RSVP';}});});})();</script>`;
  return { html: `<div class="${cls}">${heading}${body}</div>${script}`, css };
}

function renderForm({ cls, props }: RenderArgs<FormProps>): Rendered {
  const css =
    rule(`.${cls}`, {
      width: "100%",
      "max-width": "520px",
      margin: "0 auto",
      display: "flex",
      "flex-direction": "column",
      gap: "0.6rem",
      "text-align": "left",
    }) +
    sectionHeading(cls) +
    rule(`.${cls} input, .${cls} textarea`, {
      width: "100%",
      padding: "0.7rem",
      border: "1px solid #cbd5e1",
      "border-radius": "var(--wf-radius-sm)",
      "font-family": "inherit",
      "font-size": "1rem",
    }) +
    rule(`.${cls} textarea`, { "min-height": "120px", resize: "vertical" }) +
    rule(`.${cls} button`, {
      background: "var(--wf-color-primary)",
      color: "#fff",
      border: "0",
      padding: "0.8rem 1.4rem",
      "border-radius": "var(--wf-radius-full)",
      "font-weight": "600",
      cursor: "pointer",
    }) +
    rule(`.${cls} .wf-msg`, { color: "var(--wf-color-primary)", "font-weight": "600" });
  const heading =
    `<h2 class="wf-h">${escapeHtml(props.title)}</h2>` +
    (props.subtitle ? `<p class="wf-sub">${escapeHtml(props.subtitle)}</p>` : "");
  const html =
    `<form class="${cls}" data-form="${escapeAttr(props.formName)}">${heading}` +
    `<input name="name" placeholder="Your name">` +
    `<input name="email" type="email" placeholder="Email" required>` +
    `<textarea name="message" placeholder="Message"></textarea>` +
    `<button type="submit">${escapeHtml(props.submitLabel)}</button>` +
    `<p class="wf-msg" hidden>${escapeHtml(props.successMessage)}</p></form>`;
  const script =
    `<script>(function(){var W=window.__WF||{};var f=document.querySelector(${JSON.stringify(
      `.${cls}`,
    )});if(!f)return;f.addEventListener('submit',async function(e){e.preventDefault();var msg=f.querySelector('.wf-msg');var body={name:f.name.value,email:f.email.value,message:f.message.value};try{var r=await fetch(W.apiBase+'/api/storefront/'+W.siteId+'/forms/'+f.getAttribute('data-form'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(r.ok){f.querySelectorAll('input,textarea,button').forEach(function(el){el.style.display='none';});msg.hidden=false;}else{var d=await r.json();alert(d.error||'Could not send');}}catch(err){alert('Could not send');}});})();</script>`;
  return { html: `${html}${script}`, css };
}

export const REGISTRY: { [T in BlockType]: RendererFor<T> } = {
  section: renderSection,
  hero: renderHero,
  text: renderText,
  image: renderImage,
  button: renderButton,
  products: renderProducts,
  events: renderEvents,
  form: renderForm,
};
