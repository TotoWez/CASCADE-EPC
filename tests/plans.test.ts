import { describe, it, expect } from "vitest";
import { PLANS, planById, fmtLimit, fmtStorage, type PlanId } from "@/lib/plans";

/**
 * These limits are mirrored in SQL (plan_limits() in migration 0012). If this
 * test changes, update that function too — the DB is the enforcement source.
 */
const EXPECTED: Record<PlanId, { projects: number; nodesPerProject: number; members: number; storageMb: number; snapshots: number }> = {
  free:    { projects: 1,  nodesPerProject: 300,   members: 3,   storageMb: 300,  snapshots: 5 },
  pro:     { projects: 5,  nodesPerProject: 5000,  members: 50,  storageMb: 2048, snapshots: 50 },
  pro_max: { projects: 12, nodesPerProject: 12000, members: 120, storageMb: 5120, snapshots: 120 },
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
  it("fmtStorage collapses whole GB and keeps MB", () => {
    expect(fmtStorage(300)).toBe("300 MB");
    expect(fmtStorage(2048)).toBe("2 GB");
    expect(fmtStorage(5120)).toBe("5 GB");
    expect(fmtStorage(null)).toBe("Unlimited");
  });
  it("fmtLimit groups thousands and handles unlimited", () => {
    expect(fmtLimit(5000)).toBe("5,000");
    expect(fmtLimit(null)).toBe("Unlimited");
  });
});
