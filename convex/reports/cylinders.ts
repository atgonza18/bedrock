import { v, ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireInternal, requireOwnership, orgScoped } from "../lib/auth";

/**
 * Creates a cylinder set on a report. A set is a batch of cylinders cast
 * from the same pour at the same time.
 */
export const addCylinderSet = mutation({
  args: {
    reportId: v.id("reports"),
    setLabel: v.string(),
    castDate: v.number(),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const report = orgScoped(
      org._id,
      await ctx.db.get("reports", args.reportId),
    );
    requireOwnership(member, report);
    if (report.kind !== "concrete_field") {
      throw new ConvexError({ code: "WRONG_KIND" });
    }

    return await ctx.db.insert("concreteCylinderSets", {
      orgId: org._id,
      reportId: args.reportId,
      concreteFieldTestId: report.detailId as Id<"concreteFieldTests">,
      setLabel: args.setLabel,
      castDate: args.castDate,
      status: "cast",
    });
  },
});

/**
 * Adds an individual cylinder to a set. Each cylinder has a target break
 * age (7, 14, 28, or 56 days). Results are filled in later via
 * recordCylinderBreak.
 */
export const addCylinder = mutation({
  args: {
    setId: v.id("concreteCylinderSets"),
    cylinderNumber: v.string(),
    breakAgeDays: v.number(),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const set = orgScoped(
      org._id,
      await ctx.db.get("concreteCylinderSets", args.setId),
    );
    const report = await ctx.db.get("reports", set.reportId);
    if (report) requireOwnership(member, report);

    return await ctx.db.insert("concreteCylinders", {
      orgId: org._id,
      setId: args.setId,
      cylinderNumber: args.cylinderNumber,
      breakAgeDays: args.breakAgeDays,
    });
  },
});

/** Remove a cylinder (only from a draft report). */
export const removeCylinder = mutation({
  args: { cylinderId: v.id("concreteCylinders") },
  handler: async (ctx, { cylinderId }) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const cyl = orgScoped(
      org._id,
      await ctx.db.get("concreteCylinders", cylinderId),
    );
    const set = await ctx.db.get("concreteCylinderSets", cyl.setId);
    if (set) {
      const report = await ctx.db.get("reports", set.reportId);
      if (report) requireOwnership(member, report);
    }
    await ctx.db.delete("concreteCylinders", cylinderId);
  },
});

/** Remove a full cylinder set and all its cylinders. */
export const removeCylinderSet = mutation({
  args: { setId: v.id("concreteCylinderSets") },
  handler: async (ctx, { setId }) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const set = orgScoped(
      org._id,
      await ctx.db.get("concreteCylinderSets", setId),
    );
    const report = await ctx.db.get("reports", set.reportId);
    if (report) requireOwnership(member, report);

    const cylinders = await ctx.db
      .query("concreteCylinders")
      .withIndex("by_set", (q) => q.eq("setId", setId))
      .take(100);
    for (const c of cylinders) {
      await ctx.db.delete("concreteCylinders", c._id);
    }
    await ctx.db.delete("concreteCylinderSets", setId);
  },
});
