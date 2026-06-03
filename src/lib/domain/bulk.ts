/** Classify the current values of a field across a multi-selection. */
export type FieldClass = "empty" | "uniform" | "partial" | "mixed";

export interface Classification {
  kind: FieldClass;
  /** Distinct non-empty values (for the breakdown display). */
  distinct: string[];
  emptyCount: number;
  total: number;
}

const isEmpty = (v: unknown) => v === null || v === undefined || v === "";

export function classifyValues(values: unknown[]): Classification {
  const total = values.length;
  let emptyCount = 0;
  const distinct = new Set<string>();
  for (const v of values) {
    if (isEmpty(v)) emptyCount++;
    else distinct.add(String(v));
  }
  let kind: FieldClass;
  if (emptyCount === total) kind = "empty";
  else if (emptyCount === 0 && distinct.size === 1) kind = "uniform";
  else if (distinct.size <= 1) kind = "partial"; // some empty + at most one value
  else kind = "mixed";
  return { kind, distinct: [...distinct], emptyCount, total };
}

/** Status⇄progress coupling for a single field edit (mirrors single-edit rules). */
export function coupleStatusProgress(
  field: "workStatus" | "progress",
  value: string | number,
  current: { progress: number },
): { workStatus?: "not_started" | "on_progress" | "done"; progress?: number } {
  if (field === "workStatus") {
    if (value === "done") return { workStatus: "done", progress: 100 };
    if (value === "not_started") return { workStatus: "not_started", progress: 0 };
    return { workStatus: "on_progress", progress: current.progress <= 0 || current.progress >= 100 ? 50 : current.progress };
  }
  const p = Number(value);
  const workStatus = p >= 100 ? "done" : p <= 0 ? "not_started" : "on_progress";
  return { progress: p, workStatus };
}
