import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireMember, requirePermission, orgScoped } from "./lib/auth";
import { parseTemplateFields } from "./lib/customTemplates";

/** List templates visible to the caller. Internal users see all; clients see nothing.
 * Each row also carries a usage count (# of custom responses that referenced it)
 * so the admin list can show "Used in N reports" without an extra round trip. */
export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, { includeArchived }) => {
    const { org, membership } = await requireMember(ctx);
    if (membership.role === "client") return [];

    const active = await ctx.db
      .query("testTemplates")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "active"),
      )
      .take(200);

    const statuses = includeArchived
      ? [
          ...active,
          ...(await ctx.db
            .query("testTemplates")
            .withIndex("by_org_and_status", (q) =>
              q.eq("orgId", org._id).eq("status", "archived"),
            )
            .take(200)),
        ]
      : active;

    // Usage counts: any customTestResponse whose templateId matches. Reading the
    // whole responses list is acceptable at Phase 1 scale; if it grows we'll add
    // a denormalized counter on templates instead.
    const allResponses = await ctx.db
      .query("customTestResponses")
      .take(2000);
    const usageByTemplateId = new Map<string, number>();
    for (const r of allResponses) {
      if (r.orgId !== org._id) continue;
      const key = r.templateId as unknown as string;
      usageByTemplateId.set(key, (usageByTemplateId.get(key) ?? 0) + 1);
    }

    const rows = statuses.map((t) => ({
      ...t,
      usageCount: usageByTemplateId.get(t._id as unknown as string) ?? 0,
    }));

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Get one template. Any internal user can read (so techs can fill forms). */
export const getById = query({
  args: { templateId: v.id("testTemplates") },
  handler: async (ctx, { templateId }) => {
    const { org, membership } = await requireMember(ctx);
    if (membership.role === "client") throw new ConvexError({ code: "FORBIDDEN" });
    return orgScoped(org._id, await ctx.db.get("testTemplates", templateId));
  },
});

/** Create a new template. Gated on canManageTestTemplates. */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    fieldsJson: v.string(),
  },
  handler: async (ctx, { name, description, fieldsJson }) => {
    const { org, userId } = await requirePermission(ctx, "canManageTestTemplates");

    // Shape-check the JSON before persisting.
    parseTemplateFields(fieldsJson);

    const trimmed = name.trim();
    if (!trimmed) throw new ConvexError({ code: "NAME_REQUIRED" });

    return await ctx.db.insert("testTemplates", {
      orgId: org._id,
      name: trimmed,
      description: description?.trim() || undefined,
      status: "active",
      createdByUserId: userId,
      fieldsJson,
    });
  },
});

export const update = mutation({
  args: {
    templateId: v.id("testTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    fieldsJson: v.optional(v.string()),
  },
  handler: async (ctx, { templateId, ...patch }) => {
    const { org } = await requirePermission(ctx, "canManageTestTemplates");
    const existing = orgScoped(
      org._id,
      await ctx.db.get("testTemplates", templateId),
    );

    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) throw new ConvexError({ code: "NAME_REQUIRED" });
      update.name = trimmed;
    }
    if (patch.description !== undefined) {
      update.description = patch.description.trim() || undefined;
    }
    if (patch.fieldsJson !== undefined) {
      parseTemplateFields(patch.fieldsJson);
      update.fieldsJson = patch.fieldsJson;
    }
    if (Object.keys(update).length === 0) return existing._id;
    await ctx.db.patch(templateId, update);
    return templateId;
  },
});

export const setStatus = mutation({
  args: {
    templateId: v.id("testTemplates"),
    status: v.union(v.literal("active"), v.literal("archived")),
  },
  handler: async (ctx, { templateId, status }) => {
    const { org } = await requirePermission(ctx, "canManageTestTemplates");
    orgScoped(org._id, await ctx.db.get("testTemplates", templateId));
    await ctx.db.patch(templateId, { status });
  },
});

export const clone = mutation({
  args: { templateId: v.id("testTemplates") },
  handler: async (ctx, { templateId }) => {
    const { org, userId } = await requirePermission(ctx, "canManageTestTemplates");
    const source = orgScoped(
      org._id,
      await ctx.db.get("testTemplates", templateId),
    );
    return await ctx.db.insert("testTemplates", {
      orgId: org._id,
      name: `${source.name} (copy)`,
      description: source.description,
      status: "active",
      createdByUserId: userId,
      fieldsJson: source.fieldsJson,
    });
  },
});
