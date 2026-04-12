import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireInternal, orgScoped } from "../lib/auth";

/**
 * Records break test results for a concrete cylinder.
 * Called from the lab queue when a technician breaks a cylinder.
 */
export const recordCylinderBreak = mutation({
  args: {
    cylinderId: v.id("concreteCylinders"),
    loadLbs: v.number(),
    areaSqIn: v.number(),
    strengthPsi: v.number(),
    fractureType: v.union(
      v.literal("1"),
      v.literal("2"),
      v.literal("3"),
      v.literal("4"),
      v.literal("5"),
      v.literal("6"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org, userId } = member;

    const cylinder = orgScoped(
      org._id,
      await ctx.db.get("concreteCylinders", args.cylinderId),
    );

    if (cylinder.breakDate !== undefined) {
      return; // Already broken
    }

    const set = await ctx.db.get("concreteCylinderSets", cylinder.setId);
    if (!set) return;

    // Calculate actual age in days
    const actualAgeDays = Math.round(
      (Date.now() - set.castDate) / (24 * 60 * 60 * 1000),
    );

    await ctx.db.patch("concreteCylinders", args.cylinderId, {
      breakDate: Date.now(),
      brokenByUserId: userId,
      actualAgeDays,
      loadLbs: args.loadLbs,
      areaSqIn: args.areaSqIn,
      strengthPsi: args.strengthPsi,
      fractureType: args.fractureType,
      notes: args.notes,
    });

    // Check if all cylinders in the set are now broken
    const siblings = await ctx.db
      .query("concreteCylinders")
      .withIndex("by_set", (q) => q.eq("setId", cylinder.setId))
      .take(50);

    const allBroken = siblings.every(
      (c) => c._id === args.cylinderId || c.breakDate !== undefined,
    );

    if (allBroken) {
      await ctx.db.patch("concreteCylinderSets", cylinder.setId, {
        status: "complete",
      });
    }
  },
});
