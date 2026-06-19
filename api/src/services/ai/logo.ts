/**
 * Logo maker (Phase 2). MVP: a deterministic monogram SVG built from the site
 * name and brand palette — reliable and on-brand, no external dependency. A
 * richer AI/vector logo generator can replace this behind the same call site.
 */

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join("") || "W";
}

/** Hex color is validated upstream; escape defensively anyway. */
function safeColor(hex: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : "#4f46e5";
}

export function monogramSvg(
  name: string,
  primary: string,
  headingFont = "Poppins, system-ui, sans-serif",
): string {
  const text = initials(name);
  const bg = safeColor(primary);
  const font = headingFont.replace(/["<>]/g, "");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${text}">` +
    `<rect width="128" height="128" rx="28" fill="${bg}"/>` +
    `<text x="64" y="68" font-family="${font}" font-size="56" font-weight="700" fill="#ffffff" ` +
    `text-anchor="middle" dominant-baseline="central">${text}</text>` +
    `</svg>`
  );
}
