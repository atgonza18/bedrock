import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export type Role = "admin" | "pm" | "tech" | "client";

export type CurrentMember = {
  userId: Id<"users">;
  profile: Doc<"userProfiles">;
  membership: Doc<"orgMemberships">;
  org: Doc<"orgs">;
};

/**
 * Resolves the current authenticated user to their profile + active org
 * membership. Throws structured ConvexErrors if any layer is missing.
 *
 * Phase 1: a user belongs to one org. In Phase 2 we'll accept an explicit
 * orgId argument and look up `by_org_and_userId` instead.
 */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
): Promise<CurrentMember> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({ code: "UNAUTHENTICATED" });
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!profile) {
    throw new ConvexError({ code: "NO_PROFILE" });
  }

  const membership = await ctx.db
    .query("orgMemberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  if (!membership || membership.status !== "active") {
    throw new ConvexError({ code: "NO_ORG" });
  }

  const org = await ctx.db.get("orgs", membership.orgId);
  if (!org) {
    throw new ConvexError({ code: "ORG_MISSING" });
  }

  return { userId, profile, membership, org };
}

/**
 * Wraps `requireMember` and asserts the member's role is in `allowed`.
 * Throws FORBIDDEN with the required + actual role for easy client UX.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: Role[],
): Promise<CurrentMember> {
  const member = await requireMember(ctx);
  if (!allowed.includes(member.membership.role)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      required: allowed,
      actual: member.membership.role,
    });
  }
  return member;
}

/**
 * Shorthand: requires admin, pm, or tech — blocks client role from
 * all internal write operations.
 */
export async function requireInternal(
  ctx: QueryCtx | MutationCtx,
): Promise<CurrentMember> {
  return requireRole(ctx, ["admin", "pm", "tech"]);
}

/**
 * Asserts that a loaded document belongs to the caller's org. Use after
 * any `ctx.db.get(id)` on a tenant-scoped table to prevent cross-tenant
 * reads when an attacker forges an Id.
 */
export function orgScoped<T extends { orgId: Id<"orgs"> }>(
  orgId: Id<"orgs">,
  doc: T | null | undefined,
): T {
  if (!doc || doc.orgId !== orgId) {
    throw new ConvexError({ code: "FORBIDDEN" });
  }
  return doc;
}

/**
 * Asserts the caller has access to a project. Admins pass automatically.
 * Client role users pass if the project belongs to their linked client company.
 * All others must have a projectAssignment row.
 */
export async function requireProjectAccess(
  ctx: QueryCtx | MutationCtx,
  member: CurrentMember,
  projectId: Id<"projects">,
): Promise<void> {
  if (member.membership.role === "admin") return;

  // Client users: check if the project belongs to their client company.
  if (member.membership.role === "client") {
    const project = await ctx.db.get("projects", projectId);
    if (
      project &&
      project.orgId === member.org._id &&
      member.membership.clientId &&
      project.clientId === member.membership.clientId
    ) {
      return;
    }
    throw new ConvexError({ code: "FORBIDDEN", reason: "NO_PROJECT_ACCESS" });
  }

  // Internal users (pm, tech): check projectAssignment.
  const assignment = await ctx.db
    .query("projectAssignments")
    .withIndex("by_project_and_user", (q) =>
      q.eq("projectId", projectId).eq("userId", member.userId),
    )
    .unique();
  if (!assignment) {
    throw new ConvexError({ code: "FORBIDDEN", reason: "NO_PROJECT_ACCESS" });
  }
}

/**
 * Asserts the caller owns the report (for tech role). Admin and PM skip
 * the check. Client role always fails since clients can't edit reports.
 */
export function requireOwnership(
  member: CurrentMember,
  report: Doc<"reports">,
): void {
  if (member.membership.role === "admin" || member.membership.role === "pm") {
    return;
  }
  if (member.membership.role === "tech") {
    if (report.createdByUserId !== member.userId) {
      throw new ConvexError({ code: "FORBIDDEN", reason: "NOT_OWNER" });
    }
    return;
  }
  // Client or any other role — cannot edit.
  throw new ConvexError({ code: "FORBIDDEN", reason: "NOT_OWNER" });
}
