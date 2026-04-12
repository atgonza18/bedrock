import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole, orgScoped } from "./lib/auth";

const certType = v.union(
  v.literal("aci_concrete_field_1"),
  v.literal("aci_concrete_field_2"),
  v.literal("aci_concrete_strength"),
  v.literal("nuclear_gauge_rso"),
  v.literal("nicet_level_1"),
  v.literal("nicet_level_2"),
  v.literal("nicet_level_3"),
  v.literal("nicet_level_4"),
  v.literal("pe_license"),
  v.literal("other"),
);

export const list = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin"]);

    if (args.userId) {
      // Filter by specific user
      const certs = await ctx.db
        .query("techCertifications")
        .withIndex("by_org_and_user", (q) =>
          q.eq("orgId", org._id).eq("userId", args.userId!),
        )
        .take(200);

      // Enrich with user profile info
      const enriched = [];
      for (const cert of certs) {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", cert.userId))
          .unique();
        enriched.push({ ...cert, techName: profile?.fullName ?? "Unknown" });
      }
      return enriched;
    }

    // Return all for the org — scan by_org_and_user with just orgId prefix
    const certs = await ctx.db
      .query("techCertifications")
      .withIndex("by_org_and_user", (q) => q.eq("orgId", org._id))
      .take(200);

    const enriched = [];
    for (const cert of certs) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", cert.userId))
        .unique();
      enriched.push({ ...cert, techName: profile?.fullName ?? "Unknown" });
    }
    return enriched;
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    type: certType,
    customLabel: v.optional(v.string()),
    certificationNumber: v.optional(v.string()),
    issuedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin"]);

    // Verify the user belongs to this org
    const membership = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org_and_userId", (q) =>
        q.eq("orgId", org._id).eq("userId", args.userId),
      )
      .first();
    if (!membership) {
      throw new Error("User is not a member of this organization");
    }

    return await ctx.db.insert("techCertifications", {
      orgId: org._id,
      userId: args.userId,
      type: args.type,
      customLabel: args.customLabel,
      certificationNumber: args.certificationNumber,
      issuedAt: args.issuedAt,
      expiresAt: args.expiresAt,
      notes: args.notes,
    });
  },
});

export const remove = mutation({
  args: { certificationId: v.id("techCertifications") },
  handler: async (ctx, { certificationId }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(
      org._id,
      await ctx.db.get("techCertifications", certificationId),
    );
    await ctx.db.delete("techCertifications", certificationId);
  },
});
