import { describe, it, expect } from "vitest";
import { PLANS, planById, fmtLimit, fmtStorage, usageLevel, usageMessage, type PlanId } from "@/lib/plans";

/**
 * These limits are mirrored in SQL (plan_limits() in migration 0014). If this
 * test changes, update that function too — the DB is the enforcement source.
 */
const EXPECTED: Record<PlanId, { projects: number; nodesPerProject: number; members: number; storageMb: number; snapshots: number }> = {
  free:    { projects: 1,  nodesPerProject: 300,   members: 3,   storageMb: 30,  snapshots: 10 },
  pro:     { projects: 5,  nodesPerProject: 5000,  members: 50,  storageMb: 200, snapshots: 100 },
  pro_max: { projects: 12, nodesPerProject: 12000, members: 120, storageMb: 500, snapshots: 250 },
};

describe("plan catalog", () => {
  it("has exactly free / pro / pro_max in order", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "pro", "pro_max"]);
  });

  it("matches the limits mirrored in SQL", () => {
    for (const plan of PLANS) {
      expect(plan.limits).toMatchObject(EXPECTED[plan.id]);
    }
  });

  it("prices paid tiers in AED and Free at zero", () => {
    expect(planById("free").price).toBe("0 AED");
    expect(planById("pro").price).toBe("60 AED");
    expect(planById("pro_max").price).toBe("120 AED");
  });
});

describe("planById", () => {
  it("resolves known tiers", () => {
    expect(planById("pro").name).toBe("Pro");
    expect(planById("pro_max").name).toBe("Pro Max");
  });
  it("falls back to Free for unknown / missing tiers", () => {
    expect(planById(undefined).id).toBe("free");
    expect(planById(null).id).toBe("free");
    expect(planById("legacy-business").id).toBe("free");
  });
});

describe("formatters", () => {
  it("fmtStorage keeps MB and collapses whole GB", () => {
    expect(fmtStorage(30)).toBe("30 MB");
    expect(fmtStorage(500)).toBe("500 MB");
    expect(fmtStorage(2048)).toBe("2 GB");
    expect(fmtStorage(null)).toBe("Unlimited");
  });
  it("fmtLimit groups thousands and handles unlimited", () => {
    expect(fmtLimit(5000)).toBe("5,000");
    expect(fmtLimit(null)).toBe("Unlimited");
  });
});

describe("usage thresholds (50% / 80% / 100%)", () => {
  it("classifies at the 50 / 80 / 100 boundaries", () => {
    expect(usageLevel(0, 10)).toBe("ok");
    expect(usageLevel(4, 10)).toBe("ok"); // 40%
    expect(usageLevel(5, 10)).toBe("notice"); // 50%
    expect(usageLevel(7, 10)).toBe("notice"); // 70%
    expect(usageLevel(8, 10)).toBe("warning"); // 80%
    expect(usageLevel(9, 10)).toBe("warning"); // 90%
    expect(usageLevel(10, 10)).toBe("full"); // 100%
    expect(usageLevel(12, 10)).toBe("full"); // over
  });
  it("treats a null cap as unlimited (always ok)", () => {
    expect(usageLevel(9999, null)).toBe("ok");
  });
  it("returns a message only from 50% up", () => {
    expect(usageMessage("Projects", 1, 10)).toBeNull();
    expect(usageMessage("Projects", 5, 10)).toMatch(/over half used/i);
    expect(usageMessage("Projects", 8, 10)).toMatch(/almost full/i);
    expect(usageMessage("Projects", 10, 10)).toMatch(/limit reached/i);
    expect(usageMessage("Projects", 9, null)).toBeNull();
  });
});
