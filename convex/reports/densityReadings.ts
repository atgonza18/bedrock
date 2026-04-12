import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireInternal, requireOwnership, orgScoped } from "../lib/auth";

/** Add a nuclear density reading. compactionPct is server-computed. */
export const addReading = mutation({
  args: {
    reportId: v.id("reports"),
    testNumber: v.string(),
    station: v.optional(v.string()),
    offset: v.optional(v.string()),
    elevation: v.optional(v.string()),
    depthInches: v.number(),
    wetDensityPcf: v.number(),
    moisturePct: v.number(),
    dryDensityPcf: v.number(),
    maxDryDensityPcf: v.number(),
    optimumMoisturePct: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", args.reportId));
    requireOwnership(member, report);
    if (report.kind !== "nuclear_density") return;

    // Server-compute compaction percentage.
    const compactionPct =
      args.maxDryDensityPcf > 0
        ? Math.round((args.dryDensityPcf / args.maxDryDensityPcf) * 1000) / 10
        : 0;
    const passed = compactionPct >= 95; // Standard threshold; configurable later.

    return await ctx.db.insert("nuclearDensityReadings", {
      orgId: org._id,
      nuclearDensityTestId: report.detailId as Id<"nuclearDensityTests">,
      reportId: args.reportId,
      testNumber: args.testNumber,
      station: args.station,
      offset: args.offset,
      elevation: args.elevation,
      depthInches: args.depthInches,
      wetDensityPcf: args.wetDensityPcf,
      moisturePct: args.moisturePct,
      dryDensityPcf: args.dryDensityPcf,
      maxDryDensityPcf: args.maxDryDensityPcf,
      optimumMoisturePct: args.optimumMoisturePct,
      compactionPct,
      passed,
      notes: args.notes,
    });
  },
});

export const removeReading = mutation({
  args: { readingId: v.id("nuclearDensityReadings") },
  handler: async (ctx, { readingId }) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const reading = orgScoped(org._id, await ctx.db.get("nuclearDensityReadings", readingId));
    const report = await ctx.db.get("reports", reading.reportId);
    if (report) requireOwnership(member, report);
    await ctx.db.delete("nuclearDensityReadings", readingId);
  },
});
