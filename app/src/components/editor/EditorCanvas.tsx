import { useEffect, useState, type CSSProperties } from "react";
import { brandKitToCssVars } from "@webforge/shared";
import { fetchPreviewHtml } from "../../lib/api.js";
import { useEditorStore, type Breakpoint } from "../../store/editor.js";
import { CanvasBlock } from "../canvas/CanvasBlock.js";

const FRAME_WIDTH: Record<Breakpoint, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export function EditorCanvas() {
  const tree = useEditorStore((s) => s.tree);
  const brandKit = useEditorStore((s) => s.brandKit);
  const breakpoint = useEditorStore((s) => s.breakpoint);
  const mode = useEditorStore((s) => s.mode);
  const page = useEditorStore((s) => s.page);
  const select = useEditorStore((s) => s.select);
  const saveStatus = useEditorStore((s) => s.saveStatus);

  const [previewHtml, setPreviewHtml] = useState<string>("");

  // Refresh the true rendered preview when entering preview mode / changing page
  // / after a save lands, so it reflects the latest published-equivalent output.
  useEffect(() => {
    let cancelled = false;
    if (mode === "preview" && page) {
      void fetchPreviewHtml(page.id).then((html) => {
        if (!cancelled) setPreviewHtml(html);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [mode, page?.id, saveStatus === "saved"]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tree || !brandKit) {
    return <div className="grid h-full place-items-center text-slate-400">Loading canvas…</div>;
  }

  const vars = brandKitToCssVars(brandKit) as CSSProperties;
  const frameWidth = FRAME_WIDTH[breakpoint];

  return (
    <div className="wf-scroll h-full overflow-auto bg-slate-200 p-6" onClick={() => select(null)}>
      <div
        className="mx-auto bg-white shadow-xl transition-all"
        style={{
          width: frameWidth,
          maxWidth: "100%",
          minHeight: "70vh",
          borderRadius: breakpoint === "desktop" ? 8 : 18,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "preview" ? (
          <iframe
            title="preview"
            srcDoc={previewHtml}
            className="block h-[80vh] w-full border-0"
          />
        ) : (
          <div style={vars}>
            <CanvasBlock block={tree} parentId="" index={0} isRoot />
          </div>
        )}
      </div>
    </div>
  );
}
