import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireMember, requireRole, orgScoped } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireMember(ctx);
    return await ctx.db
      .query("proctorCurves")
      .withIndex("by_org_and_label", (q) => q.eq("orgId", org._id))
      .take(200);
  },
});

export const create = mutation({
  args: {
    label: v.string(),
    materialDescription: v.string(),
    maxDryDensityPcf: v.number(),
    optimumMoisturePct: v.number(),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    return await ctx.db.insert("proctorCurves", {
      orgId: org._id,
      label: args.label,
      materialDescription: args.materialDescription,
      maxDryDensityPcf: args.maxDryDensityPcf,
      optimumMoisturePct: args.optimumMoisturePct,
    });
  },
});

export const remove = mutation({
  args: { proctorId: v.id("proctorCurves") },
  handler: async (ctx, { proctorId }) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("proctorCurves", proctorId));
    await ctx.db.delete("proctorCurves", proctorId);
  },
});
