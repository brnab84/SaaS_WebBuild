import { useEffect, useState } from "react";
import type { EventsProps, FormProps, ProductsProps } from "@webforge/shared";
import type { EventDTO, ProductDTO } from "@webforge/shared";
import { eventApi, productApi } from "../../lib/api.js";
import { useEditorStore } from "../../store/editor.js";

const money = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
};

const headingStyle = { fontFamily: "var(--wf-font-heading)", fontSize: "clamp(1.6rem,4vw,2.4rem)", margin: 0 } as const;
const subStyle = { color: "var(--wf-color-muted)", margin: "4px 0 0" } as const;

/** Editor preview of the Products block — shows the workspace's real products. */
export function ProductsCanvas({ props }: { props: ProductsProps }) {
  const workspaceId = useEditorStore((s) => s.workspaceId);
  const [items, setItems] = useState<ProductDTO[]>([]);
  useEffect(() => {
    if (workspaceId) void productApi.list(workspaceId).then((r) => setItems(r.items.filter((p) => p.active)));
  }, [workspaceId]);

  const cols = Number(props.columns);
  const shown = items.slice(0, props.limit);
  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <h2 style={headingStyle}>{props.title}</h2>
      {props.subtitle && <p style={subStyle}>{props.subtitle}</p>}
      {shown.length === 0 ? (
        <p style={{ ...subStyle, marginTop: 16 }}>
          Add products in the <strong>Store</strong> — they'll appear here.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
            gap: "var(--wf-space-sm)",
            marginTop: "var(--wf-space-md)",
            textAlign: "left",
          }}
        >
          {shown.map((p) => (
            <div key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: "var(--wf-radius-md)", overflow: "hidden", background: "var(--wf-color-surface)" }}>
              {p.images[0] && <img src={p.images[0]} alt={p.title} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />}
              <div style={{ padding: "var(--wf-space-sm)", display: "flex", flexDirection: "column", gap: 6 }}>
                <strong>{p.title}</strong>
                <span style={{ fontWeight: 700, color: "var(--wf-color-primary)" }}>{money(p.priceCents, p.currency)}</span>
                <span style={{ marginTop: 6, background: "var(--wf-color-primary)", color: "#fff", padding: "0.5rem", borderRadius: "var(--wf-radius-full)", textAlign: "center", fontWeight: 600, fontSize: 13 }}>Buy now</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Editor preview of the Events block — shows the workspace's real events. */
export function EventsCanvas({ props }: { props: EventsProps }) {
  const workspaceId = useEditorStore((s) => s.workspaceId);
  const [items, setItems] = useState<EventDTO[]>([]);
  useEffect(() => {
    if (workspaceId) void eventApi.list(workspaceId).then((r) => setItems(r.items));
  }, [workspaceId]);

  const shown = items.slice(0, props.limit);
  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <h2 style={headingStyle}>{props.title}</h2>
      {props.subtitle && <p style={subStyle}>{props.subtitle}</p>}
      {shown.length === 0 ? (
        <p style={{ ...subStyle, marginTop: 16 }}>
          Create events in <strong>Events</strong> — they'll appear here with an RSVP form.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--wf-space-sm)", maxWidth: 680, margin: "var(--wf-space-md) auto 0", textAlign: "left" }}>
          {shown.map((e) => (
            <div key={e.id} style={{ border: "1px solid #e2e8f0", borderRadius: "var(--wf-radius-md)", padding: "var(--wf-space-sm)", background: "var(--wf-color-surface)" }}>
              <strong>{e.title}</strong>
              <div style={{ color: "var(--wf-color-muted)", fontSize: 14 }}>
                {new Date(e.startsAt).toLocaleString()}{e.location ? ` · ${e.location}` : ""}
                {e.capacity != null ? ` · ${e.spotsLeft} spot(s) left` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <span style={{ flex: 1, padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "var(--wf-radius-sm)", color: "#94a3b8", fontSize: 13 }}>Name</span>
                <span style={{ flex: 1, padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "var(--wf-radius-sm)", color: "#94a3b8", fontSize: 13 }}>Email</span>
                <span style={{ background: "var(--wf-color-primary)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "var(--wf-radius-full)", fontWeight: 600, fontSize: 13 }}>RSVP</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Editor preview of the Form block — renders the actual contact form. */
export function FormCanvas({ props }: { props: FormProps }) {
  const field = { width: "100%", padding: "0.7rem", border: "1px solid #cbd5e1", borderRadius: "var(--wf-radius-sm)", fontSize: 16 } as const;
  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
      <h2 style={headingStyle}>{props.title}</h2>
      {props.subtitle && <p style={subStyle}>{props.subtitle}</p>}
      <input disabled placeholder="Your name" style={field} />
      <input disabled placeholder="Email" style={field} />
      <textarea disabled placeholder="Message" style={{ ...field, minHeight: 100 }} />
      <span style={{ background: "var(--wf-color-primary)", color: "#fff", padding: "0.8rem 1.4rem", borderRadius: "var(--wf-radius-full)", fontWeight: 600, textAlign: "center" }}>
        {props.submitLabel}
      </span>
    </div>
  );
}
