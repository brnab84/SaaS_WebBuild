import type { ReactNode } from "react";
import { SIZES, type Block } from "@webforge/shared";
import { useEditorStore } from "../../store/editor.js";
import { findNode } from "../../lib/tree.js";
import { AssetUpload } from "./AssetUpload.js";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Text({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className={inputClass}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Area({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      className={`${inputClass} min-h-[80px] resize-y`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Num({
  value,
  onChange,
  min = 1,
  max = 48,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      className={inputClass}
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
      }}
    />
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Accepts hex or a token reference like var(--wf-color-primary).
  const isToken = value.startsWith("var(");
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="h-8 w-10 cursor-pointer rounded border border-slate-300"
        value={isToken ? "#ffffff" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isToken}
        title={isToken ? "Token-driven (edit in Brand Kit)" : "Pick a color"}
      />
      <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const ALIGN = ["left", "center", "right"] as const;

function FieldsForBlock({ block }: { block: Block }) {
  const update = useEditorStore((s) => s.updateBlockProps);
  const set = (patch: Record<string, unknown>) => update(block.id, patch);

  switch (block.type) {
    case "section":
      return (
        <>
          <Row label="Background">
            <Color value={block.props.bg} onChange={(v) => set({ bg: v })} />
          </Row>
          <Row label="Padding">
            <Select value={block.props.padding} options={SIZES} onChange={(v) => set({ padding: v })} />
          </Row>
          <Row label="Gap">
            <Select value={block.props.gap} options={SIZES} onChange={(v) => set({ gap: v })} />
          </Row>
          <Row label="Max width">
            <Select
              value={block.props.maxWidth}
              options={["full", "narrow", "default", "wide"]}
              onChange={(v) => set({ maxWidth: v })}
            />
          </Row>
          <Row label="Direction">
            <Select
              value={block.props.direction}
              options={["column", "row"]}
              onChange={(v) => set({ direction: v })}
            />
          </Row>
          <Row label="Align">
            <Select value={block.props.align} options={ALIGN} onChange={(v) => set({ align: v })} />
          </Row>
        </>
      );
    case "hero":
      return (
        <>
          <Row label="Eyebrow">
            <Text value={block.props.eyebrow} onChange={(v) => set({ eyebrow: v })} />
          </Row>
          <Row label="Title">
            <Text value={block.props.title} onChange={(v) => set({ title: v })} />
          </Row>
          <Row label="Subtitle">
            <Area value={block.props.subtitle} onChange={(v) => set({ subtitle: v })} />
          </Row>
          <Row label="Button label">
            <Text value={block.props.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
          </Row>
          <Row label="Button link">
            <Text value={block.props.ctaHref} onChange={(v) => set({ ctaHref: v })} />
          </Row>
          <Row label="Align">
            <Select value={block.props.align} options={ALIGN} onChange={(v) => set({ align: v })} />
          </Row>
          <Row label="Background">
            <Color value={block.props.bg} onChange={(v) => set({ bg: v })} />
          </Row>
          <Row label="Text color">
            <Color value={block.props.textColor} onChange={(v) => set({ textColor: v })} />
          </Row>
        </>
      );
    case "text":
      return (
        <>
          <Row label="Content">
            <Area value={block.props.content} onChange={(v) => set({ content: v })} />
          </Row>
          <Row label="Size">
            <Select
              value={block.props.size}
              options={["sm", "md", "lg", "xl", "2xl", "3xl"]}
              onChange={(v) => set({ size: v })}
            />
          </Row>
          <Row label="Align">
            <Select value={block.props.align} options={ALIGN} onChange={(v) => set({ align: v })} />
          </Row>
          <Row label="Color">
            <Color value={block.props.color} onChange={(v) => set({ color: v })} />
          </Row>
        </>
      );
    case "image":
      return (
        <>
          <Row label="Image">
            <AssetUpload onUploaded={(url) => set({ src: url })} />
          </Row>
          <Row label="Image URL">
            <Text value={block.props.src} onChange={(v) => set({ src: v })} />
          </Row>
          <Row label="Alt text">
            <Text value={block.props.alt} onChange={(v) => set({ alt: v })} />
          </Row>
          <Row label="Width (CSS)">
            <Text value={block.props.width} onChange={(v) => set({ width: v })} placeholder="100%" />
          </Row>
          <Row label="Corner radius">
            <Select value={block.props.radius} options={SIZES} onChange={(v) => set({ radius: v })} />
          </Row>
          <Row label="Align">
            <Select value={block.props.align} options={ALIGN} onChange={(v) => set({ align: v })} />
          </Row>
        </>
      );
    case "button":
      return (
        <>
          <Row label="Label">
            <Text value={block.props.label} onChange={(v) => set({ label: v })} />
          </Row>
          <Row label="Link">
            <Text value={block.props.href} onChange={(v) => set({ href: v })} />
          </Row>
          <Row label="Variant">
            <Select
              value={block.props.variant}
              options={["solid", "outline", "ghost"]}
              onChange={(v) => set({ variant: v })}
            />
          </Row>
          <Row label="Size">
            <Select
              value={block.props.size}
              options={["sm", "md", "lg"]}
              onChange={(v) => set({ size: v })}
            />
          </Row>
          <Row label="Align">
            <Select value={block.props.align} options={ALIGN} onChange={(v) => set({ align: v })} />
          </Row>
        </>
      );
    case "products":
      return (
        <>
          <Row label="Title">
            <Text value={block.props.title} onChange={(v) => set({ title: v })} />
          </Row>
          <Row label="Subtitle">
            <Text value={block.props.subtitle} onChange={(v) => set({ subtitle: v })} />
          </Row>
          <Row label="Columns">
            <Select value={block.props.columns} options={["2", "3", "4"]} onChange={(v) => set({ columns: v })} />
          </Row>
          <Row label="Max products">
            <Num value={block.props.limit} onChange={(v) => set({ limit: v })} />
          </Row>
          <p className="px-1 text-[11px] text-slate-400">Shows your active products (managed in Store).</p>
        </>
      );
    case "events":
      return (
        <>
          <Row label="Title">
            <Text value={block.props.title} onChange={(v) => set({ title: v })} />
          </Row>
          <Row label="Subtitle">
            <Text value={block.props.subtitle} onChange={(v) => set({ subtitle: v })} />
          </Row>
          <Row label="Max events">
            <Num value={block.props.limit} onChange={(v) => set({ limit: v })} />
          </Row>
          <p className="px-1 text-[11px] text-slate-400">Shows your events with an RSVP form (managed in Events).</p>
        </>
      );
    case "form":
      return (
        <>
          <Row label="Title">
            <Text value={block.props.title} onChange={(v) => set({ title: v })} />
          </Row>
          <Row label="Subtitle">
            <Area value={block.props.subtitle} onChange={(v) => set({ subtitle: v })} />
          </Row>
          <Row label="Form name">
            <Text value={block.props.formName} onChange={(v) => set({ formName: v })} />
          </Row>
          <Row label="Button label">
            <Text value={block.props.submitLabel} onChange={(v) => set({ submitLabel: v })} />
          </Row>
          <Row label="Success message">
            <Area value={block.props.successMessage} onChange={(v) => set({ successMessage: v })} />
          </Row>
          <p className="px-1 text-[11px] text-slate-400">Submissions appear in the Events page inbox.</p>
        </>
      );
    default:
      return null;
  }
}

export function PropertiesPanel() {
  const tree = useEditorStore((s) => s.tree);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selected = tree && selectedId ? findNode(tree, selectedId) : null;

  if (!selected) {
    return (
      <p className="px-1 text-sm text-slate-500">
        Select a block on the canvas to edit its properties.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {selected.type} properties
      </h3>
      <FieldsForBlock block={selected} />
    </div>
  );
}
