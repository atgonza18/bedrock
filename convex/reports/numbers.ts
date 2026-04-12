import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Atomically increments the org-scoped counter for the given year and
 * returns a formatted report number like "CMT-2026-00042".
 *
 * Safe under concurrency because Convex mutations serialize writes to
 * the same `counters` document.
 */
export async function nextReportNumber(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
): Promise<string> {
  const year = new Date().getUTCFullYear();
  const key = `report_number_${year}`;

  const counter = await ctx.db
    .query("counters")
    .withIndex("by_org_and_key", (q) => q.eq("orgId", orgId).eq("key", key))
    .unique();

  let nextVal: number;
  if (!counter) {
    nextVal = 1;
    await ctx.db.insert("counters", { orgId, key, value: 1 });
  } else {
    nextVal = counter.value + 1;
    await ctx.db.patch("counters", counter._id, { value: nextVal });
  }

  return `CMT-${year}-${String(nextVal).padStart(5, "0")}`;
}
