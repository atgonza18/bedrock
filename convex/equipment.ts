import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole, orgScoped } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    return await ctx.db
      .query("equipment")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", org._id))
      .take(200);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("nuclear_gauge"),
      v.literal("air_meter"),
      v.literal("compression_machine"),
      v.literal("dcp"),
      v.literal("other"),
    ),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    calibrationDueDate: v.optional(v.number()),
    lastCalibratedAt: v.optional(v.number()),
    nrcLicenseNumber: v.optional(v.string()),
    leakTestDueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin"]);
    return await ctx.db.insert("equipment", {
      orgId: org._id,
      ...args,
      status: "active",
    });
  },
});

export const update = mutation({
  args: {
    equipmentId: v.id("equipment"),
    name: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    calibrationDueDate: v.optional(v.number()),
    lastCalibratedAt: v.optional(v.number()),
    leakTestDueDate: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("out_of_service"),
        v.literal("retired"),
      ),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { equipmentId, ...patch }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("equipment", equipmentId));
    const cleanPatch: Record<string, any> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) cleanPatch[k] = val;
    }
    if (Object.keys(cleanPatch).length > 0) {
      await ctx.db.patch("equipment", equipmentId, cleanPatch);
    }
  },
});

export const remove = mutation({
  args: { equipmentId: v.id("equipment") },
  handler: async (ctx, { equipmentId }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("equipment", equipmentId));
    await ctx.db.delete("equipment", equipmentId);
  },
});
