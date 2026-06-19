import { z } from "zod";
import { uuid } from "./ids.js";
import { token } from "./tokens.js";

/**
 * Block engine — the core of WebForge.
 *
 * A page is a serializable JSON tree of blocks. Every node has the same shape:
 *   { id, type, props, children }
 * Leaf blocks simply carry an empty `children` array, which keeps the editor
 * (drag/drop, reordering) and the renderer uniform.
 *
 * Each block type defines: a zod schema for its props, a default props factory
 * (here), an edit component (app) and a render function (renderer).
 */

export const SIZES = ["none", "xs", "sm", "md", "lg", "xl"] as const;
export const sizeEnum = z.enum(SIZES);
export type Size = z.infer<typeof sizeEnum>;

export const alignEnum = z.enum(["left", "center", "right"]);
export type Align = z.infer<typeof alignEnum>;

export const BLOCK_TYPES = [
  "section",
  "hero",
  "text",
  "image",
  "button",
  "products",
  "events",
  "form",
] as const;
export const blockTypeEnum = z.enum(BLOCK_TYPES);
export type BlockType = z.infer<typeof blockTypeEnum>;

/** Lightweight, render-ready shapes injected into dynamic blocks before render. */
export interface ProductLite {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
  image: string | null;
}
export interface EventLite {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  spotsLeft: number | null;
}

/* -------------------------------------------------------------------------- */
/* Per-block prop schemas                                                      */
/* -------------------------------------------------------------------------- */

export const sectionPropsSchema = z.object({
  padding: sizeEnum.default("lg"),
  gap: sizeEnum.default("md"),
  bg: z.string().default(token.color("bg")),
  maxWidth: z.enum(["full", "narrow", "default", "wide"]).default("default"),
  align: alignEnum.default("left"),
  direction: z.enum(["row", "column"]).default("column"),
});
export type SectionProps = z.infer<typeof sectionPropsSchema>;

export const heroPropsSchema = z.object({
  eyebrow: z.string().default(""),
  title: z.string().default("Your big idea, online in minutes"),
  subtitle: z.string().default("Build a beautiful, fast website without writing code."),
  ctaLabel: z.string().default("Get started"),
  ctaHref: z.string().default("#"),
  align: alignEnum.default("center"),
  bg: z.string().default(token.color("surface")),
  textColor: z.string().default(token.color("text")),
});
export type HeroProps = z.infer<typeof heroPropsSchema>;

export const textPropsSchema = z.object({
  content: z.string().default("Write something compelling here."),
  size: z.enum(["sm", "md", "lg", "xl", "2xl", "3xl"]).default("md"),
  align: alignEnum.default("left"),
  color: z.string().default(token.color("text")),
});
export type TextProps = z.infer<typeof textPropsSchema>;

export const imagePropsSchema = z.object({
  src: z.string().default("https://placehold.co/960x540?text=Image"),
  alt: z.string().default(""),
  radius: sizeEnum.default("md"),
  width: z.string().default("100%"),
  align: alignEnum.default("center"),
});
export type ImageProps = z.infer<typeof imagePropsSchema>;

export const buttonPropsSchema = z.object({
  label: z.string().default("Click me"),
  href: z.string().default("#"),
  variant: z.enum(["solid", "outline", "ghost"]).default("solid"),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  align: alignEnum.default("left"),
});
export type ButtonProps = z.infer<typeof buttonPropsSchema>;

export const productsPropsSchema = z.object({
  title: z.string().default("Our products"),
  subtitle: z.string().default(""),
  columns: z.enum(["2", "3", "4"]).default("3"),
  limit: z.number().int().min(1).max(48).default(12),
});
/** `_items` is injected at render time by the API; not part of the saved tree. */
export type ProductsProps = z.infer<typeof productsPropsSchema> & { _items?: ProductLite[] };

export const eventsPropsSchema = z.object({
  title: z.string().default("Upcoming events"),
  subtitle: z.string().default(""),
  limit: z.number().int().min(1).max(48).default(6),
});
export type EventsProps = z.infer<typeof eventsPropsSchema> & { _items?: EventLite[] };

export const formPropsSchema = z.object({
  title: z.string().default("Get in touch"),
  subtitle: z.string().default("We'd love to hear from you."),
  formName: z.string().default("contact"),
  submitLabel: z.string().default("Send message"),
  successMessage: z.string().default("Thanks! We'll be in touch soon."),
});
/** `_siteId` is injected at render time so the static form can POST to the API. */
export type FormProps = z.infer<typeof formPropsSchema> & { _siteId?: string };

/* -------------------------------------------------------------------------- */
/* Recursive block tree                                                        */
/* -------------------------------------------------------------------------- */

interface BlockBase {
  id: string;
  children: Block[];
}
export interface SectionBlock extends BlockBase {
  type: "section";
  props: SectionProps;
}
export interface HeroBlock extends BlockBase {
  type: "hero";
  props: HeroProps;
}
export interface TextBlock extends BlockBase {
  type: "text";
  props: TextProps;
}
export interface ImageBlock extends BlockBase {
  type: "image";
  props: ImageProps;
}
export interface ButtonBlock extends BlockBase {
  type: "button";
  props: ButtonProps;
}
export interface ProductsBlock extends BlockBase {
  type: "products";
  props: ProductsProps;
}
export interface EventsBlock extends BlockBase {
  type: "events";
  props: EventsProps;
}
export interface FormBlock extends BlockBase {
  type: "form";
  props: FormProps;
}
export type Block =
  | SectionBlock
  | HeroBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | ProductsBlock
  | EventsBlock
  | FormBlock;

const childrenSchema = z.array(z.lazy((): z.ZodType<Block> => blockSchema)).default([]);

const sectionSchema = z.object({
  id: z.string(),
  type: z.literal("section"),
  props: sectionPropsSchema,
  children: childrenSchema,
});
const heroSchema = z.object({
  id: z.string(),
  type: z.literal("hero"),
  props: heroPropsSchema,
  children: childrenSchema,
});
const textSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  props: textPropsSchema,
  children: childrenSchema,
});
const imageSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  props: imagePropsSchema,
  children: childrenSchema,
});
const buttonSchema = z.object({
  id: z.string(),
  type: z.literal("button"),
  props: buttonPropsSchema,
  children: childrenSchema,
});
const productsSchema = z.object({
  id: z.string(),
  type: z.literal("products"),
  props: productsPropsSchema,
  children: childrenSchema,
});
const eventsSchema = z.object({
  id: z.string(),
  type: z.literal("events"),
  props: eventsPropsSchema,
  children: childrenSchema,
});
const formSchema = z.object({
  id: z.string(),
  type: z.literal("form"),
  props: formPropsSchema,
  children: childrenSchema,
});

export const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.discriminatedUnion("type", [
    sectionSchema,
    heroSchema,
    textSchema,
    imageSchema,
    buttonSchema,
    productsSchema,
    eventsSchema,
    formSchema,
  ]),
) as z.ZodType<Block>;

/** A page tree always has a single root (conventionally a `section`). */
export const pageTreeSchema: z.ZodType<Block> = blockSchema;

/** Which block types may contain children in the editor. */
export const CONTAINER_TYPES: ReadonlySet<BlockType> = new Set(["section"]);

export function isContainer(type: BlockType): boolean {
  return CONTAINER_TYPES.has(type);
}

/* -------------------------------------------------------------------------- */
/* Factories & metadata (used by the editor palette)                           */
/* -------------------------------------------------------------------------- */

const PROP_DEFAULTS: { [K in BlockType]: z.ZodTypeAny } = {
  section: sectionPropsSchema,
  hero: heroPropsSchema,
  text: textPropsSchema,
  image: imagePropsSchema,
  button: buttonPropsSchema,
  products: productsPropsSchema,
  events: eventsPropsSchema,
  form: formPropsSchema,
};

/** Create a new block of `type` with schema-default props and a fresh id. */
export function makeBlock<T extends BlockType>(type: T): Extract<Block, { type: T }> {
  const props = PROP_DEFAULTS[type].parse({});
  return { id: uuid(), type, props, children: [] } as unknown as Extract<Block, { type: T }>;
}

/** A starter page tree for newly created pages. */
export function makeStarterTree(): SectionBlock {
  const root = makeBlock("section") as SectionBlock;
  root.props.padding = "none";
  const hero = makeBlock("hero");
  const text = makeBlock("text");
  root.children = [hero, text];
  return root;
}

export interface BlockMeta {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
}

export const BLOCK_LIBRARY: readonly BlockMeta[] = [
  { type: "section", label: "Section", description: "Layout container", icon: "▭" },
  { type: "hero", label: "Hero", description: "Headline + call to action", icon: "★" },
  { type: "text", label: "Text", description: "Paragraph or heading", icon: "T" },
  { type: "image", label: "Image", description: "Picture or graphic", icon: "▦" },
  { type: "button", label: "Button", description: "Link / action", icon: "⬚" },
  { type: "products", label: "Products", description: "Store grid + checkout", icon: "🛍" },
  { type: "events", label: "Events", description: "Event list + RSVP", icon: "📅" },
  { type: "form", label: "Form", description: "Contact / lead form", icon: "✉" },
];
