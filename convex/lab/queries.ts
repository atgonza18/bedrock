import { query } from "../_generated/server";
import { requireInternal } from "../lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lists all unbroken cylinders organized by urgency for the lab queue.
 * Returns cylinders grouped as: overdue, today, this week, upcoming.
 */
export const listBreakQueue = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireInternal(ctx);

    // Get all cylinder sets that aren't complete
    const sets = await ctx.db
      .query("concreteCylinderSets")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", org._id))
      .take(500);

    const activeSets = sets.filter((s) => s.status !== "complete");

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = todayStart + DAY_MS;
    const weekEnd = todayStart + 7 * DAY_MS;

    const items: {
      cylinder: Awaited<ReturnType<typeof ctx.db.get<"concreteCylinders">>> & {};
      set: (typeof activeSets)[number];
      targetBreakDate: number;
      reportNumber: string;
      projectName: string;
    }[] = [];

    for (const set of activeSets) {
      const cylinders = await ctx.db
        .query("concreteCylinders")
        .withIndex("by_set", (q) => q.eq("setId", set._id))
        .take(50);

      // Only include unbroken cylinders
      const unbroken = cylinders.filter((c) => c.breakDate === undefined);
      if (unbroken.length === 0) continue;

      // Resolve report number and project name
      const report = await ctx.db.get("reports", set.reportId);
      let projectName = "Unknown";
      let reportNumber = "—";
      if (report) {
        reportNumber = report.number;
        const project = await ctx.db.get("projects", report.projectId);
        projectName = project?.name ?? "Unknown";
      }

      for (const cyl of unbroken) {
        const targetBreakDate = set.castDate + cyl.breakAgeDays * DAY_MS;
        items.push({
          cylinder: cyl,
          set,
          targetBreakDate,
          reportNumber,
          projectName,
        });
      }
    }

    // Sort by target break date (most urgent first)
    items.sort((a, b) => a.targetBreakDate - b.targetBreakDate);

    // Group by urgency
    const overdue = items.filter((i) => i.targetBreakDate < todayStart);
    const today = items.filter(
      (i) => i.targetBreakDate >= todayStart && i.targetBreakDate < todayEnd,
    );
    const thisWeek = items.filter(
      (i) => i.targetBreakDate >= todayEnd && i.targetBreakDate < weekEnd,
    );
    const upcoming = items.filter((i) => i.targetBreakDate >= weekEnd);

    return { overdue, today, thisWeek, upcoming, total: items.length };
  },
});

/** Recent break results for the lab dashboard. */
export const listRecentBreaks = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireInternal(ctx);

    // Get recently broken cylinders (last 50)
    const sets = await ctx.db
      .query("concreteCylinderSets")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", org._id))
      .take(500);

    const results: {
      cylinder: Awaited<ReturnType<typeof ctx.db.get<"concreteCylinders">>> & {};
      setLabel: string;
      reportNumber: string;
      projectName: string;
    }[] = [];

    for (const set of sets) {
      const cylinders = await ctx.db
        .query("concreteCylinders")
        .withIndex("by_set", (q) => q.eq("setId", set._id))
        .take(50);

      const broken = cylinders.filter((c) => c.breakDate !== undefined);
      if (broken.length === 0) continue;

      const report = await ctx.db.get("reports", set.reportId);
      let projectName = "Unknown";
      let reportNumber = "—";
      if (report) {
        reportNumber = report.number;
        const project = await ctx.db.get("projects", report.projectId);
        projectName = project?.name ?? "Unknown";
      }

      for (const cyl of broken) {
        results.push({
          cylinder: cyl,
          setLabel: set.setLabel,
          reportNumber,
          projectName,
        });
      }
    }

    // Sort by break date desc (most recent first)
    results.sort(
      (a, b) => (b.cylinder.breakDate ?? 0) - (a.cylinder.breakDate ?? 0),
    );

    return results.slice(0, 30);
  },
});
