import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireMember, requireRole, orgScoped } from "./lib/auth";

// ---------- Queries ----------

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireMember(ctx);
    return await ctx.db
      .query("clients")
      .withIndex("by_org_and_name", (q) => q.eq("orgId", org._id))
      .take(200);
  },
});

export const getById = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const { org } = await requireMember(ctx);
    const client = orgScoped(org._id, await ctx.db.get("clients", clientId));
    return client;
  },
});

export const listContacts = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const { org } = await requireMember(ctx);
    orgScoped(org._id, await ctx.db.get("clients", clientId));
    return await ctx.db
      .query("clientContacts")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .take(200);
  },
});

// ---------- Mutations ----------

export const create = mutation({
  args: {
    name: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin"]);
    return await ctx.db.insert("clients", {
      orgId: org._id,
      name: args.name,
      notes: args.notes,
    });
  },
});

export const update = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, ...updates }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("clients", clientId));
    const patch: Record<string, string | undefined> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    await ctx.db.patch("clients", clientId, patch);
  },
});

export const remove = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("clients", clientId));
    // Check for linked projects before deletion
    const linkedProject = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .first();
    if (linkedProject) {
      throw new ConvexError({
        code: "HAS_PROJECTS",
        message: "Cannot delete a client that has projects. Archive the projects first.",
      });
    }
    // Delete all contacts
    const contacts = await ctx.db
      .query("clientContacts")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .take(500);
    for (const c of contacts) {
      await ctx.db.delete("clientContacts", c._id);
    }
    await ctx.db.delete("clients", clientId);
  },
});

// ---------- Contact mutations ----------

export const createContact = mutation({
  args: {
    clientId: v.id("clients"),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, ...rest }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("clients", clientId));
    return await ctx.db.insert("clientContacts", {
      orgId: org._id,
      clientId,
      fullName: rest.fullName,
      email: rest.email,
      phone: rest.phone,
      title: rest.title,
      isActive: true,
    });
  },
});

export const updateContact = mutation({
  args: {
    contactId: v.id("clientContacts"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { contactId, ...updates }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("clientContacts", contactId));
    const patch: Record<string, unknown> = {};
    if (updates.fullName !== undefined) patch.fullName = updates.fullName;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    await ctx.db.patch("clientContacts", contactId, patch);
  },
});

export const removeContact = mutation({
  args: { contactId: v.id("clientContacts") },
  handler: async (ctx, { contactId }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("clientContacts", contactId));
    await ctx.db.delete("clientContacts", contactId);
  },
});
