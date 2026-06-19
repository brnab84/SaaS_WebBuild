import type { BrandColors } from "@webforge/shared";
import { useEditorStore } from "../../store/editor.js";
import { AssetUpload } from "./AssetUpload.js";

const COLOR_LABELS: Record<keyof BrandColors, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  bg: "Background",
  surface: "Surface",
  text: "Text",
  muted: "Muted",
};

export function BrandKitPanel() {
  const brandKit = useEditorStore((s) => s.brandKit);
  const update = useEditorStore((s) => s.updateBrandKit);
  if (!brandKit) return null;

  const setColor = (key: keyof BrandColors, value: string) =>
    update({ colors: { ...brandKit.colors, [key]: value } });

  const setFont = (key: "heading" | "body", value: string) =>
    update({ fonts: { ...brandKit.fonts, [key]: value } });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Logo
        </h3>
        <div className="space-y-2 px-1 pt-1">
          {brandKit.logo && (
            <img
              src={brandKit.logo}
              alt="Brand logo"
              className="max-h-16 rounded border border-slate-200 bg-slate-50 p-1"
            />
          )}
          <AssetUpload onUploaded={(url) => update({ logo: url })} label="Upload logo" />
          {brandKit.logo && (
            <button
              onClick={() => update({ logo: null })}
              className="text-xs text-slate-400 hover:text-rose-600"
            >
              Remove logo
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Colors
        </h3>
        <p className="px-1 pb-2 text-[11px] text-slate-400">
          Tokens propagate to every block instantly.
        </p>
        <div className="space-y-2">
          {(Object.keys(COLOR_LABELS) as (keyof BrandColors)[]).map((key) => (
            <div key={key} className="flex items-center justify-between gap-2 px-1">
              <span className="text-sm text-slate-600">{COLOR_LABELS[key]}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandKit.colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border border-slate-300"
                />
                <code className="w-16 text-right text-xs text-slate-500">
                  {brandKit.colors[key]}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Typography
        </h3>
        <div className="space-y-2 px-1 pt-1">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Heading font</span>
            <input
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              value={brandKit.fonts.heading}
              onChange={(e) => setFont("heading", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Body font</span>
            <input
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              value={brandKit.fonts.body}
              onChange={(e) => setFont("body", e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
