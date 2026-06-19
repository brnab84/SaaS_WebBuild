/** Turn an arbitrary string into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .toString()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // strip combining diacritics
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "site"
  );
}

/** Append a short random suffix to keep a slug unique within a scope. */
export function withRandomSuffix(base: string): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}
