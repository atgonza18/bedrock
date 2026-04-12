import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireRole, orgScoped } from "./lib/auth";
import { role } from "./schema";

// NOTE: this lives at convex/users.ts (not convex/auth/me.ts as the plan
// sketch suggested). The existing convex/auth.ts (Convex Auth's exports)
// already owns the `api.auth.*` namespace, so a sibling `convex/auth/`
// directory could be ambiguous. `api.users.me` is cleaner anyway.

export type MeResult =
  | { state: "unauthenticated" }
  | { state: "no_profile"; userId: Id<"users"> }
  | {
      state: "no_org";
      userId: Id<"users">;
      profile: Doc<"userProfiles">;
    }
  | {
      state: "ok";
      userId: Id<"users">;
      profile: Doc<"userProfiles">;
      membership: Doc<"orgMemberships">;
      org: Doc<"orgs">;
    };

/**
 * "Who am I" query for the frontend. Returns a discriminated state so the
 * UI can render the right shell:
 *   - unauthenticated -> sign-in screen
 *   - no_profile      -> first-run profile setup (M2)
 *   - no_org          -> waiting-room (invite pending or no membership)
 *   - ok              -> full app shell
 *
 * Does NOT throw on unauthenticated; the FE polls this on every render.
 */
export const me = query({
  args: {},
  handler: async (ctx): Promise<MeResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { state: "unauthenticated" };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) {
      return { state: "no_profile", userId };
    }

    const membership = await ctx.db
      .query("orgMemberships")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.status !== "active") {
      return { state: "no_org", userId, profile };
    }

    const org = await ctx.db.get("orgs", membership.orgId);
    if (!org) {
      return { state: "no_org", userId, profile };
    }

    return { state: "ok", userId, profile, membership, org };
  },
});

// ---------- Admin queries ----------

/** List all org members with their profiles. Admin only. */
export const listOrgMembers = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    const memberships = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org_and_userId", (q) => q.eq("orgId", org._id))
      .take(200);

    const members = [];
    for (const m of memberships) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", m.userId))
        .unique();
      const authUser = await ctx.db.get("users", m.userId);
      members.push({
        membership: m,
        profile,
        email: authUser?.email ?? null,
      });
    }
    return members;
  },
});

/** Update a member's role. Admin only. Cannot demote yourself. */
export const updateMemberRole = mutation({
  args: {
    membershipId: v.id("orgMemberships"),
    role,
  },
  handler: async (ctx, args) => {
    const { org, userId } = await requireRole(ctx, ["admin"]);
    const target = orgScoped(
      org._id,
      await ctx.db.get("orgMemberships", args.membershipId),
    );
    if (target.userId === userId) {
      // Prevent self-demotion so there is always at least one admin.
      return;
    }
    await ctx.db.patch("orgMemberships", args.membershipId, {
      role: args.role,
    });
  },
});
