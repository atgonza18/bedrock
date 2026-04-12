import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole } from "./lib/auth";

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    const logoUrl = org.logoStorageId
      ? await ctx.storage.getUrl(org.logoStorageId)
      : null;
    return {
      _id: org._id,
      displayName: org.displayName,
      logoStorageId: org.logoStorageId,
      logoUrl,
      primaryColor: org.primaryColor,
      emailFromAddress: org.emailFromAddress,
      emailReplyTo: org.emailReplyTo,
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateBranding = mutation({
  args: {
    logoStorageId: v.optional(v.id("_storage")),
    primaryColor: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin"]);
    const patch: Record<string, any> = {};
    for (const [k, val] of Object.entries(args)) {
      if (val !== undefined) patch[k] = val;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("orgs", org._id, patch);
    }
  },
});

export const removeLogo = mutation({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    if (org.logoStorageId) {
      await ctx.storage.delete(org.logoStorageId);
      await ctx.db.patch("orgs", org._id, { logoStorageId: undefined });
    }
  },
});
