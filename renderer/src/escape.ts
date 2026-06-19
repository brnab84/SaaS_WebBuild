/** HTML/CSS escaping helpers. The renderer never trusts user-authored strings. */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text destined for element content. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
}

/** Escape a value destined for a double-quoted attribute. */
export function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

/** Convert plain text with newlines into HTML, escaping and preserving breaks. */
export function escapeMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

/**
 * Guard a CSS value so a malicious prop cannot break out of its declaration
 * block or inject extra rules. Allows tokens like `var(--wf-color-primary)`.
 */
export function cssValue(value: unknown): string {
  return String(value ?? "")
    .replace(/[;{}<>]/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .trim();
}

/** Only allow safe URL schemes in href/src to prevent javascript: injection. */
export function safeUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (raw === "") return "#";
  // Allow relative URLs, anchors, mailto, tel, http(s), and data:image.
  if (/^(https?:\/\/|mailto:|tel:|\/|#|\.|data:image\/)/i.test(raw)) {
    return escapeAttr(raw);
  }
  // Block javascript:, vbscript:, etc.
  return "#";
}
