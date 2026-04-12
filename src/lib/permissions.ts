/**
 * Frontend permission helpers. Derive UI visibility from the `me` query result.
 * All real enforcement happens on the backend — these just prevent showing
 * buttons that would fail.
 */

type MeResult = {
  state: "ok";
  membership: { role: string };
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

export function canReview(me: MeResult): boolean {
  return me.membership.role === "pm" || me.membership.role === "admin";
}
