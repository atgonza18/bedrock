import { ConvexError } from "convex/values";

export type ReportStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "rejected"
  | "approved"
  | "delivered"
  | "archived";

/** Allowed status transitions. Key = from, values = allowed tos. */
const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["in_review", "archived"],
  in_review: ["approved", "rejected", "archived"],
  rejected: ["submitted", "archived"],
  approved: ["delivered", "archived"],
  delivered: ["archived"],
  archived: [],           // restore is handled separately, not via assertTransition
};

/**
 * Asserts that a status transition is valid. Throws INVALID_TRANSITION
 * with context if not. Called from mutations before writing the new status.
 */
export function assertTransition(from: ReportStatus, to: ReportStatus): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ConvexError({
      code: "INVALID_TRANSITION",
      from,
      to,
      allowed,
    });
  }
}
