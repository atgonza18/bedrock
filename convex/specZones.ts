import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole, orgScoped } from "./lib/auth";

/** List all spec zones for a project, ordered by sortOrder. */
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const { org } = await requireRole(ctx, ["admin", "pm", "tech"]);
    orgScoped(org._id, await ctx.db.get("projects", projectId));

    const zones = await ctx.db
      .query("projectSpecZones")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .take(100);

    // Resolve Proctor labels
    const result = [];
    for (const z of zones) {
      let proctorLabel: string | null = null;
      if (z.referencedProctorId) {
        const p = await ctx.db.get("proctorCurves", z.referencedProctorId);
        proctorLabel = p?.label ?? null;
      }
      result.push({ ...z, proctorLabel });
    }

    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/** Create a new spec zone on a project. */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    coordinates: v.optional(v.string()),
    specMinCompactionPct: v.optional(v.number()),
    specProctorType: v.optional(v.union(v.literal("standard"), v.literal("modified"))),
    referencedProctorId: v.optional(v.id("proctorCurves")),
    specMinConcreteStrengthPsi: v.optional(v.number()),
    specPileType: v.optional(v.string()),
    specPileDesignLoadKips: v.optional(v.number()),
    specPileFailureCriterion: v.optional(v.string()),
    specNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("projects", args.projectId));

    // Get next sort order
    const existing = await ctx.db
      .query("projectSpecZones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(100);
    const maxSort = existing.reduce((max, z) => Math.max(max, z.sortOrder), -1);

    return await ctx.db.insert("projectSpecZones", {
      orgId: org._id,
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      coordinates: args.coordinates,
      specMinCompactionPct: args.specMinCompactionPct,
      specProctorType: args.specProctorType,
      referencedProctorId: args.referencedProctorId,
      specMinConcreteStrengthPsi: args.specMinConcreteStrengthPsi,
      specPileType: args.specPileType,
      specPileDesignLoadKips: args.specPileDesignLoadKips,
      specPileFailureCriterion: args.specPileFailureCriterion,
      specNotes: args.specNotes,
      sortOrder: maxSort + 1,
    });
  },
});

/** Update a spec zone. */
export const update = mutation({
  args: {
    zoneId: v.id("projectSpecZones"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    coordinates: v.optional(v.string()),
    specMinCompactionPct: v.optional(v.number()),
    specProctorType: v.optional(v.union(v.literal("standard"), v.literal("modified"))),
    referencedProctorId: v.optional(v.id("proctorCurves")),
    specMinConcreteStrengthPsi: v.optional(v.number()),
    specPileType: v.optional(v.string()),
    specPileDesignLoadKips: v.optional(v.number()),
    specPileFailureCriterion: v.optional(v.string()),
    specNotes: v.optional(v.string()),
  },
  handler: async (ctx, { zoneId, ...patch }) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("projectSpecZones", zoneId));
    const cleanPatch: Record<string, any> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) cleanPatch[k] = val;
    }
    if (Object.keys(cleanPatch).length > 0) {
      await ctx.db.patch("projectSpecZones", zoneId, cleanPatch);
    }
  },
});

/** Delete a spec zone. */
export const remove = mutation({
  args: { zoneId: v.id("projectSpecZones") },
  handler: async (ctx, { zoneId }) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("projectSpecZones", zoneId));
    await ctx.db.delete("projectSpecZones", zoneId);
  },
});
