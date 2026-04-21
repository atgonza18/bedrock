import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireMember, requirePermission, orgScoped } from "./lib/auth";
import { parseTemplateFields } from "./lib/customTemplates";

/** List reusable field blocks. Any internal user can see them (so they appear
 *  in the builder's "Insert block" menu when a PM is mid-build). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { org, membership } = await requireMember(ctx);
    if (membership.role === "client") return [];
    return await ctx.db
      .query("templateBlocks")
      .withIndex("by_org_and_name", (q) => q.eq("orgId", org._id))
      .take(200);
  },
});

/** Save a group of fields as a reusable block. Gated on canManageTestTemplates. */
export const save = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    fieldsJson: v.string(),
  },
  handler: async (ctx, args) => {
    const { org, userId } = await requirePermission(ctx, "canManageTestTemplates");
    parseTemplateFields(args.fieldsJson);
    const trimmed = args.name.trim();
    if (!trimmed) throw new ConvexError({ code: "NAME_REQUIRED" });

    return await ctx.db.insert("templateBlocks", {
      orgId: org._id,
      name: trimmed,
      description: args.description?.trim() || undefined,
      createdByUserId: userId,
      fieldsJson: args.fieldsJson,
    });
  },
});

export const remove = mutation({
  args: { blockId: v.id("templateBlocks") },
  handler: async (ctx, { blockId }) => {
    const { org } = await requirePermission(ctx, "canManageTestTemplates");
    orgScoped(org._id, await ctx.db.get("templateBlocks", blockId));
    await ctx.db.delete(blockId);
  },
});
