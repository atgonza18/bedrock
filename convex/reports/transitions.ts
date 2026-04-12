import { ConvexError } from "convex/values";

export type ReportStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "rejected"
  | "approved"
  | "delivered";

/** Allowed status transitions. Key = from, values = allowed tos. */
const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  draft: ["submitted"],
  submitted: ["in_review"],
  in_review: ["approved", "rejected"],
  rejected: ["submitted"],          // tech re-submits after fixing
  approved: ["delivered"],
  delivered: [],                     // terminal
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
