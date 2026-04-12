import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireInternal, requireOwnership, orgScoped } from "../lib/auth";

export const addLayer = mutation({
  args: {
    reportId: v.id("reports"),
    sequence: v.number(),
    fromDepthIn: v.number(),
    toDepthIn: v.number(),
    blowCount: v.number(),
    soilDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", args.reportId));
    requireOwnership(member, report);
    if (report.kind !== "dcp") return;

    // Compute DCP index and estimated CBR per ASTM D6951.
    const thickness = args.toDepthIn - args.fromDepthIn;
    const dcpIndexMmPerBlow =
      args.blowCount > 0
        ? Math.round((thickness * 25.4 / args.blowCount) * 100) / 100
        : 0;
    // Log-based CBR estimate: CBR = 292 / DPI^1.12 (standard correlation)
    const estimatedCbrPct =
      dcpIndexMmPerBlow > 0
        ? Math.round((292 / Math.pow(dcpIndexMmPerBlow, 1.12)) * 10) / 10
        : 0;

    return await ctx.db.insert("dcpLayers", {
      orgId: org._id,
      dcpTestId: report.detailId as Id<"dcpTests">,
      reportId: args.reportId,
      sequence: args.sequence,
      fromDepthIn: args.fromDepthIn,
      toDepthIn: args.toDepthIn,
      blowCount: args.blowCount,
      dcpIndexMmPerBlow,
      estimatedCbrPct,
      soilDescription: args.soilDescription,
    });
  },
});

export const removeLayer = mutation({
  args: { layerId: v.id("dcpLayers") },
  handler: async (ctx, { layerId }) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const layer = orgScoped(org._id, await ctx.db.get("dcpLayers", layerId));
    const report = await ctx.db.get("reports", layer.reportId);
    if (report) requireOwnership(member, report);
    await ctx.db.delete("dcpLayers", layerId);
  },
});
