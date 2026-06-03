import { describe, it, expect } from "vitest";
import { classifyValues, coupleStatusProgress } from "@/lib/domain/bulk";

describe("bulk value classification", () => {
  it("labels empty / uniform / partial / mixed", () => {
    expect(classifyValues(["", "", ""]).kind).toBe("empty");
    expect(classifyValues(["a", "a", "a"]).kind).toBe("uniform");
    expect(classifyValues(["a", "", "a"]).kind).toBe("partial");
    expect(classifyValues(["a", "b", ""]).kind).toBe("mixed");
  });
  it("reports distinct values and empty counts", () => {
    const c = classifyValues(["x", "y", "", "x"]);
    expect(c.emptyCount).toBe(1);
    expect(c.total).toBe(4);
    expect(new Set(c.distinct)).toEqual(new Set(["x", "y"]));
  });
});

describe("status/progress coupling", () => {
  it("couples done/not-started/on-progress and progress thresholds", () => {
    expect(coupleStatusProgress("workStatus", "done", { progress: 20 })).toEqual({ workStatus: "done", progress: 100 });
    expect(coupleStatusProgress("workStatus", "not_started", { progress: 50 })).toEqual({ workStatus: "not_started", progress: 0 });
    expect(coupleStatusProgress("progress", 100, { progress: 0 })).toEqual({ progress: 100, workStatus: "done" });
    expect(coupleStatusProgress("progress", 0, { progress: 50 })).toEqual({ progress: 0, workStatus: "not_started" });
    expect(coupleStatusProgress("progress", 40, { progress: 0 })).toEqual({ progress: 40, workStatus: "on_progress" });
  });
});
