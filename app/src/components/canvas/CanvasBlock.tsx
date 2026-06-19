import type { CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BLOCK_LIBRARY, type Block } from "@webforge/shared";
import { useEditorStore } from "../../store/editor.js";
import { blockStyle, sectionInnerStyle } from "./blockStyles.js";

const label = (type: string) => BLOCK_LIBRARY.find((b) => b.type === type)?.label ?? type;

/** Visual rendering of a single (non-container) block in the edit canvas. */
function BlockVisual({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return (
        <div style={blockStyle(block)}>
          {block.props.eyebrow && (
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--wf-color-primary)",
              }}
            >
              {block.props.eyebrow}
            </p>
          )}
          <div
            style={{
              fontFamily: "var(--wf-font-heading)",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.1,
              fontWeight: 700,
            }}
          >
            {block.props.title}
          </div>
          <p style={{ margin: 0, fontSize: "1.15rem", opacity: 0.85, maxWidth: "44ch" }}>
            {block.props.subtitle}
          </p>
          {block.props.ctaLabel && (
            <span
              style={{
                marginTop: "var(--wf-space-xs)",
                display: "inline-block",
                background: "var(--wf-color-primary)",
                color: "#fff",
                padding: "0.7rem 1.6rem",
                borderRadius: "var(--wf-radius-full)",
                fontWeight: 600,
              }}
            >
              {block.props.ctaLabel}
            </span>
          )}
        </div>
      );
    case "text":
      return <div style={blockStyle(block)}>{block.props.content}</div>;
    case "image":
      return <img src={block.props.src} alt={block.props.alt} style={blockStyle(block)} />;
    case "button":
      return (
        <div style={{ display: "flex", justifyContent: alignToJustify(block.props.align), width: "100%" }}>
          <span style={blockStyle(block)}>{block.props.label}</span>
        </div>
      );
    default:
      return null;
  }
}

function alignToJustify(a: "left" | "center" | "right") {
  return a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";
}

/** A section's droppable children area + sortable list (enables nesting). */
function SectionChildren({ block }: { block: Block }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${block.id}`,
    data: { kind: "zone", parentId: block.id },
  });
  const ids = block.children.map((c) => c.id);
  return (
    <div
      ref={setNodeRef}
      style={{
        ...sectionInnerStyle(block),
        outline: isOver ? "2px dashed var(--wf-color-primary)" : undefined,
        outlineOffset: "4px",
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {block.children.length === 0 && (
          <div
            style={{
              width: "100%",
              padding: "1.5rem",
              textAlign: "center",
              color: "var(--wf-color-muted)",
              border: "2px dashed #cbd5e1",
              borderRadius: 8,
              fontSize: "0.85rem",
            }}
          >
            Drop blocks here
          </div>
        )}
        {block.children.map((child, i) => (
          <CanvasBlock key={child.id} block={child} parentId={block.id} index={i} />
        ))}
      </SortableContext>
    </div>
  );
}

/** Selectable + sortable wrapper around a block (recurses for sections). */
export function CanvasBlock({
  block,
  parentId,
  index,
  isRoot = false,
}: {
  block: Block;
  parentId: string;
  index: number;
  isRoot?: boolean;
}) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const selected = selectedId === block.id;

  const sortable = useSortable({
    id: block.id,
    data: { kind: "block", id: block.id, parentId, index },
    disabled: isRoot,
  });

  const wrapperStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
    outline: selected ? "2px solid var(--wf-color-primary)" : "1px solid transparent",
    outlineOffset: "2px",
    borderRadius: 4,
    cursor: isRoot ? "default" : "grab",
  };

  const isSection = block.type === "section";

  return (
    <div
      ref={sortable.setNodeRef}
      style={wrapperStyle}
      {...(isRoot ? {} : sortable.attributes)}
      {...(isRoot ? {} : sortable.listeners)}
      onClick={(e) => {
        e.stopPropagation();
        select(block.id);
      }}
    >
      {selected && !isRoot && (
        <div
          style={{
            position: "absolute",
            top: -22,
            left: 0,
            zIndex: 5,
            display: "flex",
            gap: 6,
            alignItems: "center",
            background: "var(--wf-color-primary)",
            color: "#fff",
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          <span>{label(block.type)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
            style={{ color: "#fff", lineHeight: 1, fontWeight: 700 }}
            title="Delete block"
          >
            ×
          </button>
        </div>
      )}

      {isSection ? (
        <section style={blockStyle(block)}>
          <SectionChildren block={block} />
        </section>
      ) : (
        <BlockVisual block={block} />
      )}
    </div>
  );
}
