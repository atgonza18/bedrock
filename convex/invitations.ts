import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole, orgScoped } from "./lib/auth";
import { role } from "./schema";

const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------- Queries ----------

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    return await ctx.db
      .query("orgInvitations")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", org._id))
      .take(200);
  },
});

// ---------- Mutations ----------

export const create = mutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    role,
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    const { org, userId } = await requireRole(ctx, ["admin"]);

    // If clientId is provided, verify it belongs to this org.
    if (args.clientId) {
      orgScoped(org._id, await ctx.db.get("clients", args.clientId));
    }

    // Don't allow duplicate pending invitations for the same email.
    const existing = await ctx.db
      .query("orgInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", args.email).eq("status", "pending"),
      )
      .first();
    if (existing && existing.orgId === org._id) {
      throw new ConvexError({
        code: "DUPLICATE_INVITATION",
        message: `A pending invitation already exists for ${args.email}.`,
      });
    }

    const now = Date.now();
    return await ctx.db.insert("orgInvitations", {
      orgId: org._id,
      email: args.email,
      fullName: args.fullName,
      role: args.clientId ? "client" : args.role,
      status: "pending",
      invitedByUserId: userId,
      invitedAt: now,
      expiresAt: now + INVITATION_TTL_MS,
      clientId: args.clientId,
    });
  },
});

export const revoke = mutation({
  args: { invitationId: v.id("orgInvitations") },
  handler: async (ctx, { invitationId }) => {
    const { org, userId } = await requireRole(ctx, ["admin"]);
    const inv = orgScoped(
      org._id,
      await ctx.db.get("orgInvitations", invitationId),
    );
    if (inv.status !== "pending") {
      throw new ConvexError({
        code: "NOT_PENDING",
        message: "Only pending invitations can be revoked.",
      });
    }
    await ctx.db.patch("orgInvitations", invitationId, {
      status: "revoked",
      revokedAt: Date.now(),
      revokedByUserId: userId,
    });
  },
});
