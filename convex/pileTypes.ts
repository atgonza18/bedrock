import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole, requireMember, orgScoped } from "./lib/auth";

/** List all pile types for a project. */
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const { org } = await requireMember(ctx);
    orgScoped(org._id, await ctx.db.get("projects", projectId));
    return await ctx.db
      .query("projectPileTypes")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .take(100);
  },
});

/** Create a new pile type on a project. */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    designLoadKips: v.optional(v.number()),
    installedLengthFt: v.optional(v.number()),
    failureCriterion: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("projects", args.projectId));
    return await ctx.db.insert("projectPileTypes", {
      orgId: org._id,
      ...args,
    });
  },
});

/** Update a pile type. */
export const update = mutation({
  args: {
    pileTypeId: v.id("projectPileTypes"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    designLoadKips: v.optional(v.number()),
    installedLengthFt: v.optional(v.number()),
    failureCriterion: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { pileTypeId, ...patch }) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("projectPileTypes", pileTypeId));
    const cleanPatch: Record<string, any> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) cleanPatch[k] = val;
    }
    if (Object.keys(cleanPatch).length > 0) {
      await ctx.db.patch("projectPileTypes", pileTypeId, cleanPatch);
    }
  },
});

/** Delete a pile type. */
export const remove = mutation({
  args: { pileTypeId: v.id("projectPileTypes") },
  handler: async (ctx, { pileTypeId }) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("projectPileTypes", pileTypeId));
    await ctx.db.delete("projectPileTypes", pileTypeId);
  },
});
