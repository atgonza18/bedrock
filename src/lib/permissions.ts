/**
 * Frontend permission helpers. Derive UI visibility from the `me` query result.
 * All real enforcement happens on the backend — these just prevent showing
 * buttons that would fail.
 */

export type Permission =
  | "canViewAllProjects"
  | "canManageTeam"
  | "canViewAllocation"
  | "canApproveReports"
  | "canManageTestTemplates";

type MembershipWithPerms = {
  role: string;
} & Partial<Record<Permission, boolean | undefined>>;

type MeResult = {
  state: "ok";
  membership: MembershipWithPerms;
  userId: string;
};

export function isInternal(me: MeResult): boolean {
  return me.membership.role !== "client";
}

export function isClient(me: MeResult): boolean {
  return me.membership.role === "client";
}

export function canCreateReport(me: MeResult): boolean {
  return isInternal(me);
}

export function canEditReport(
  me: MeResult,
  report: { createdByUserId: string },
): boolean {
  const role = me.membership.role;
  if (role === "client") return false;
  if (role === "admin" || role === "pm") return true;
  // Tech can only edit own reports.
  return report.createdByUserId === me.userId;
}

/**
 * Core permission check — mirrors `permits()` in convex/lib/auth.ts exactly.
 * Admin always has every permission; client never has internal permissions;
 * PM has `canApproveReports` by default; explicit toggles on the membership
 * override the defaults for pm/tech.
 */
export function permits(me: MeResult, permission: Permission): boolean {
  const role = me.membership.role;
  if (role === "admin") return true;
  if (role === "client") return false;

  const explicit = me.membership[permission];
  if (explicit === true) return true;
  if (explicit === false) return false;

  if (permission === "canApproveReports" && role === "pm") return true;
  if (permission === "canManageTestTemplates" && role === "pm") return true;
  return false;
}

export function canReview(me: MeResult): boolean {
  return permits(me, "canApproveReports");
}
