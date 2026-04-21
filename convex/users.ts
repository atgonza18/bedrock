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

/**
 * Update the current user's own profile. Supports partial updates — any
 * field left undefined is not touched. Used by the profile/settings page
 * for name, phone, PE credentials, and signature/seal storage IDs.
 */
export const updateProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    peLicenseNumber: v.optional(v.string()),
    peStates: v.optional(v.array(v.string())),
    signatureStorageId: v.optional(v.id("_storage")),
    sealStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");
    const patch: Partial<Doc<"userProfiles">> = {};
    if (args.fullName !== undefined) patch.fullName = args.fullName;
    if (args.phone !== undefined) {
      patch.phone = args.phone.trim() === "" ? undefined : args.phone;
    }
    if (args.peLicenseNumber !== undefined) {
      patch.peLicenseNumber =
        args.peLicenseNumber.trim() === "" ? undefined : args.peLicenseNumber;
    }
    if (args.peStates !== undefined) patch.peStates = args.peStates;
    if (args.signatureStorageId !== undefined) {
      patch.signatureStorageId = args.signatureStorageId;
    }
    if (args.sealStorageId !== undefined) {
      patch.sealStorageId = args.sealStorageId;
    }
    await ctx.db.patch(profile._id, patch);
  },
});

/** Remove (clear) a profile asset by field name. */
export const clearProfileAsset = mutation({
  args: {
    field: v.union(v.literal("signature"), v.literal("seal")),
  },
  handler: async (ctx, { field }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");
    const patch: Partial<Doc<"userProfiles">> = {};
    if (field === "signature") patch.signatureStorageId = undefined;
    if (field === "seal") patch.sealStorageId = undefined;
    await ctx.db.patch(profile._id, patch);
  },
});

/** Generate a storage upload URL for profile assets (signature, seal). */
export const generateProfileUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Get signed URLs for the current user's signature and seal, for display. */
export const getMyProfileAssets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;
    const signatureUrl = profile.signatureStorageId
      ? await ctx.storage.getUrl(profile.signatureStorageId)
      : null;
    const sealUrl = profile.sealStorageId
      ? await ctx.storage.getUrl(profile.sealStorageId)
      : null;
    return { signatureUrl, sealUrl };
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

/**
 * Update per-user permission overrides on a membership. Admin only.
 * Passing `null` for a field clears the override so the role's default applies.
 */
export const updateMemberPermissions = mutation({
  args: {
    membershipId: v.id("orgMemberships"),
    canViewAllProjects: v.optional(v.union(v.boolean(), v.null())),
    canManageTeam: v.optional(v.union(v.boolean(), v.null())),
    canViewAllocation: v.optional(v.union(v.boolean(), v.null())),
    canApproveReports: v.optional(v.union(v.boolean(), v.null())),
  },
  handler: async (ctx, args) => {
    const { org, userId } = await requireRole(ctx, ["admin"]);
    const target = orgScoped(
      org._id,
      await ctx.db.get("orgMemberships", args.membershipId),
    );
    if (target.userId === userId) {
      // An admin modifying themselves is a no-op — admin always has all perms.
      return;
    }
    if (target.role === "client") {
      throw new Error("Permissions don't apply to client users.");
    }
    const patch: Record<string, boolean | undefined> = {};
    const keys = [
      "canViewAllProjects",
      "canManageTeam",
      "canViewAllocation",
      "canApproveReports",
    ] as const;
    for (const key of keys) {
      const v = args[key];
      if (v === undefined) continue;
      patch[key] = v === null ? undefined : v;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("orgMemberships", args.membershipId, patch);
    }
  },
});
