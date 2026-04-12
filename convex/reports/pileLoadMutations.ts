import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireInternal, requireOwnership, orgScoped } from "../lib/auth";

export const addIncrement = mutation({
  args: {
    reportId: v.id("reports"),
    sequence: v.number(),
    loadKips: v.number(),
    appliedAt: v.number(),
    heldForMinutes: v.number(),
    netSettlementIn: v.number(),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", args.reportId));
    requireOwnership(member, report);
    if (report.kind !== "pile_load") return;

    return await ctx.db.insert("pileLoadIncrements", {
      orgId: org._id,
      pileLoadTestId: report.detailId as Id<"pileLoadTests">,
      reportId: args.reportId,
      sequence: args.sequence,
      loadKips: args.loadKips,
      appliedAt: args.appliedAt,
      heldForMinutes: args.heldForMinutes,
      netSettlementIn: args.netSettlementIn,
    });
  },
});

export const removeIncrement = mutation({
  args: { incrementId: v.id("pileLoadIncrements") },
  handler: async (ctx, { incrementId }) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const inc = orgScoped(org._id, await ctx.db.get("pileLoadIncrements", incrementId));
    const report = await ctx.db.get("reports", inc.reportId);
    if (report) requireOwnership(member, report);
    // Also delete any readings linked to this increment.
    // Delete any readings linked to this increment.
    const readings = await ctx.db
      .query("pileLoadReadings")
      .withIndex("by_test_and_sequence", (q) => q)
      .take(500);
    for (const r of readings) {
      if (r.pileLoadIncrementId === incrementId) {
        await ctx.db.delete("pileLoadReadings", r._id);
      }
    }
    await ctx.db.delete("pileLoadIncrements", incrementId);
  },
});

export const addReading = mutation({
  args: {
    reportId: v.id("reports"),
    incrementId: v.optional(v.id("pileLoadIncrements")),
    sequence: v.number(),
    recordedAt: v.number(),
    loadKips: v.optional(v.number()),
    dialGauge1In: v.optional(v.number()),
    dialGauge2In: v.optional(v.number()),
    averageSettlementIn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", args.reportId));
    requireOwnership(member, report);
    if (report.kind !== "pile_load") return;

    return await ctx.db.insert("pileLoadReadings", {
      orgId: org._id,
      pileLoadTestId: report.detailId as Id<"pileLoadTests">,
      pileLoadIncrementId: args.incrementId,
      reportId: args.reportId,
      sequence: args.sequence,
      recordedAt: args.recordedAt,
      loadKips: args.loadKips,
      dialGauge1In: args.dialGauge1In,
      dialGauge2In: args.dialGauge2In,
      averageSettlementIn: args.averageSettlementIn,
    });
  },
});
