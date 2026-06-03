/** Deterministic colors for sibling groups and categories (UI + PDF parity). */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Accent color for a sibling group. All children of one parent share it;
 * the root group uses a neutral steel tone.
 */
export function siblingAccent(parentId: string | null): string {
  if (parentId === null) return "#79889A"; // steel-400, neutral root
  const hue = hash(parentId) % 360;
  return `hsl(${hue} 55% 55%)`;
}

/** Category color: explicit stored color wins, else deterministic from name. */
export function categoryColor(name: string, stored?: string | null): string {
  if (stored) return stored;
  if (name === "root") return "#79889A";
  if (name === "general") return "#9AA8BA";
  const hue = hash(name) % 360;
  return `hsl(${hue} 60% 52%)`;
}
