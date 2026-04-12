import { getAuthUserId } from "@convex-dev/auth/server";
import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Invitations expire 30 days after issue by default.
const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type PendingInvitationResult =
  | { kind: "none" }
  | {
      kind: "pending";
      invitation: Doc<"orgInvitations">;
      org: Doc<"orgs">;
    };

/**
 * Checks whether there is a pending invitation for the current user's
 * email address. Called by the onboarding screen to decide between
 * "claim invite" vs "ask your admin" UI. Returns `{ kind: "none" }`
 * when the user is unauthenticated, has no email on their Convex Auth
 * identity, or has no matching pending invitation.
 */
export const getPendingInvitation = query({
  args: {},
  handler: async (ctx): Promise<PendingInvitationResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { kind: "none" };

    const user = await ctx.db.get("users", userId);
    const email = user?.email;
    if (!email) return { kind: "none" };

    const invitation = await ctx.db
      .query("orgInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", email).eq("status", "pending"),
      )
      .first();
    if (!invitation) return { kind: "none" };
    if (invitation.expiresAt < Date.now()) return { kind: "none" };

    const org = await ctx.db.get("orgs", invitation.orgId);
    if (!org) return { kind: "none" };

    return { kind: "pending", invitation, org };
  },
});

/**
 * Checks whether ANY org exists in the deployment. Drives the
 * "bootstrap the first org" flow on the onboarding screen.
 */
export const hasAnyOrg = query({
  args: {},
  handler: async (ctx) => {
    const first = await ctx.db.query("orgs").first();
    return first !== null;
  },
});

/**
 * First-user bootstrap: creates the initial org, user profile, and an
 * admin membership for the caller. Only allowed when:
 *   - the caller is authenticated
 *   - no orgs exist yet in the deployment
 *   - the caller does not already have a profile
 *
 * After the first org exists, subsequent users must be invited.
 */
export const createFirstOrg = mutation({
  args: {
    orgName: v.string(),
    orgSlug: v.string(),
    orgDisplayName: v.string(),
    adminFullName: v.string(),
  },
  handler: async (ctx, args): Promise<{ orgId: Id<"orgs"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }

    const existing = await ctx.db.query("orgs").first();
    if (existing !== null) {
      throw new ConvexError({ code: "ORG_ALREADY_EXISTS" });
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existingProfile) {
      throw new ConvexError({ code: "PROFILE_EXISTS" });
    }

    const orgId = await ctx.db.insert("orgs", {
      name: args.orgName,
      slug: args.orgSlug,
      displayName: args.orgDisplayName,
    });

    await ctx.db.insert("userProfiles", {
      userId,
      fullName: args.adminFullName,
    });

    await ctx.db.insert("orgMemberships", {
      orgId,
      userId,
      role: "admin",
      status: "active",
    });

    return { orgId };
  },
});

/**
 * Claims a pending invitation for the authenticated user. Matches the
 * user's Convex Auth email against pending `orgInvitations` rows and,
 * on a hit, creates the user's profile + org membership and marks the
 * invitation accepted. Safe to call multiple times — if the user already
 * has a matching membership it is left alone.
 */
export const claimInvitation = mutation({
  args: {},
  handler: async (ctx): Promise<{ orgId: Id<"orgs"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db.get("users", userId);
    const email = user?.email;
    if (!email) {
      throw new ConvexError({ code: "NO_EMAIL" });
    }

    const invitation = await ctx.db
      .query("orgInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", email).eq("status", "pending"),
      )
      .first();
    if (!invitation) {
      throw new ConvexError({ code: "NO_INVITATION" });
    }
    if (invitation.expiresAt < Date.now()) {
      throw new ConvexError({ code: "INVITATION_EXPIRED" });
    }

    // Create profile if it doesn't exist yet (idempotent).
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!existingProfile) {
      await ctx.db.insert("userProfiles", {
        userId,
        fullName: invitation.fullName,
      });
    }

    // Create membership if it doesn't exist yet (idempotent).
    const existingMembership = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org_and_userId", (q) =>
        q.eq("orgId", invitation.orgId).eq("userId", userId),
      )
      .unique();
    if (!existingMembership) {
      await ctx.db.insert("orgMemberships", {
        orgId: invitation.orgId,
        userId,
        role: invitation.role,
        status: "active",
        clientId: invitation.clientId,
      });
    }

    await ctx.db.patch("orgInvitations", invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
      acceptedByUserId: userId,
    });

    return { orgId: invitation.orgId };
  },
});

// Exported for use by convex/invitations.ts when computing expiry defaults.
export const getInvitationTtlMs = () => INVITATION_TTL_MS;
