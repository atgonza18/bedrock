import { v, ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { requireMember, requireRole, requireInternal, requirePermission, requireProjectAccess, orgScoped } from "../lib/auth";

// ---------- List queries ----------

/** All reports in a project, ordered newest first. */
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const member = await requireMember(ctx);
    const { org } = member;
    orgScoped(org._id, await ctx.db.get("projects", projectId));
    await requireProjectAccess(ctx, member, projectId);

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_project_and_status", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(200);

    // Resolve creator names (and custom template names) for the list view.
    const result = [];
    for (const r of reports) {
      const creator = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", r.createdByUserId))
        .unique();
      let templateName: string | null = null;
      if (r.kind === "custom") {
        const response = await ctx.db.get(
          "customTestResponses",
          r.detailId as Id<"customTestResponses">,
        );
        templateName = response?.templateNameAtCreation ?? null;
      }
      result.push({
        ...r,
        creatorName: creator?.fullName ?? "Unknown",
        templateName,
      });
    }
    return result;
  },
});

/** All reports created by the current user, any status. */
export const listMyReports = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireInternal(ctx);

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_createdBy_and_status", (q) =>
        q.eq("createdByUserId", userId),
      )
      .order("desc")
      .take(100);

    const result = [];
    for (const r of reports) {
      const project = await ctx.db.get("projects", r.projectId);
      let templateName: string | null = null;
      if (r.kind === "custom") {
        const response = await ctx.db.get(
          "customTestResponses",
          r.detailId as Id<"customTestResponses">,
        );
        templateName = response?.templateNameAtCreation ?? null;
      }
      result.push({
        ...r,
        projectName: project?.name ?? "Unknown",
        templateName,
      });
    }
    return result;
  },
});

/** Reports in draft or rejected status created by the current user. */
export const listMyDrafts = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireInternal(ctx);

    const drafts = await ctx.db
      .query("reports")
      .withIndex("by_createdBy_and_status", (q) =>
        q.eq("createdByUserId", userId).eq("status", "draft"),
      )
      .order("desc")
      .take(50);

    const rejected = await ctx.db
      .query("reports")
      .withIndex("by_createdBy_and_status", (q) =>
        q.eq("createdByUserId", userId).eq("status", "rejected"),
      )
      .order("desc")
      .take(50);

    // Merge and sort by _creationTime desc.
    const all = [...drafts, ...rejected].sort(
      (a, b) => b._creationTime - a._creationTime,
    );

    // Resolve project names.
    const result = [];
    for (const r of all) {
      const project = await ctx.db.get("projects", r.projectId);
      let templateName: string | null = null;
      if (r.kind === "custom") {
        const response = await ctx.db.get(
          "customTestResponses",
          r.detailId as Id<"customTestResponses">,
        );
        templateName = response?.templateNameAtCreation ?? null;
      }
      result.push({
        ...r,
        projectName: project?.name ?? "Unknown",
        templateName,
      });
    }
    return result;
  },
});

// ---------- Daily field log ----------

/** Reports grouped by date for the daily field log. */
export const listDailyLog = query({
  args: {
    date: v.number(), // timestamp of the target day (start of day)
  },
  handler: async (ctx, args) => {
    const { userId } = await requireInternal(ctx);

    // Get all reports created by this user
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_createdBy_and_status", (q) =>
        q.eq("createdByUserId", userId),
      )
      .take(500);

    // Filter to reports with fieldDate on the target day
    const dayStart = args.date;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayReports = reports.filter(
      (r) => r.fieldDate && r.fieldDate >= dayStart && r.fieldDate < dayEnd,
    );

    // Resolve project names
    const result = [];
    for (const r of dayReports) {
      const project = await ctx.db.get("projects", r.projectId);
      let templateName: string | null = null;
      if (r.kind === "custom") {
        const response = await ctx.db.get(
          "customTestResponses",
          r.detailId as Id<"customTestResponses">,
        );
        templateName = response?.templateNameAtCreation ?? null;
      }
      result.push({
        ...r,
        projectName: project?.name ?? "Unknown",
        templateName,
      });
    }
    return result;
  },
});

// ---------- Detail query ----------

/** Full report bundle for the detail page. */
export const getById = query({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const member = await requireMember(ctx);
    const { org } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));
    await requireProjectAccess(ctx, member, report.projectId);

    // Client role users can only see approved/delivered reports.
    if (
      member.membership.role === "client" &&
      report.status !== "approved" &&
      report.status !== "delivered"
    ) {
      throw new ConvexError({ code: "FORBIDDEN", reason: "NOT_APPROVED" });
    }

    const project = await ctx.db.get("projects", report.projectId);
    const creator = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", report.createdByUserId))
      .unique();

    // Resolve reviewer name if report is being reviewed.
    let reviewerName: string | null = null;
    if (report.reviewingUserId) {
      const reviewer = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", report.reviewingUserId!))
        .unique();
      reviewerName = reviewer?.fullName ?? null;
    }

    // Resolve rejector name if report was rejected.
    let rejectedByName: string | null = null;
    if (report.rejectedByUserId) {
      const rejector = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", report.rejectedByUserId!))
        .unique();
      rejectedByName = rejector?.fullName ?? null;
    }

    // Load kind-specific detail.
    let detail: Record<string, any> | null = null;
    if (report.kind === "concrete_field") {
      detail = await ctx.db.get("concreteFieldTests", report.detailId as Id<"concreteFieldTests">);
    } else if (report.kind === "nuclear_density") {
      detail = await ctx.db.get("nuclearDensityTests", report.detailId as Id<"nuclearDensityTests">);
    } else if (report.kind === "proof_roll") {
      detail = await ctx.db.get("proofRollObservations", report.detailId as Id<"proofRollObservations">);
    } else if (report.kind === "dcp") {
      detail = await ctx.db.get("dcpTests", report.detailId as Id<"dcpTests">);
    } else if (report.kind === "pile_load") {
      detail = await ctx.db.get("pileLoadTests", report.detailId as Id<"pileLoadTests">);
    } else if (report.kind === "custom") {
      const response = await ctx.db.get(
        "customTestResponses",
        report.detailId as Id<"customTestResponses">,
      );
      if (response) {
        // Resolve photo URLs for every photo field so the FE can render inline.
        // We scan the values for any `storageIds` arrays and map each to a URL.
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(response.valuesJson || "{}");
        } catch {
          parsed = {};
        }
        const photoUrls: Record<string, Array<{ storageId: string; url: string | null }>> = {};
        for (const [fieldId, rawValue] of Object.entries(parsed)) {
          const value = rawValue as { kind?: string; storageIds?: unknown };
          if (value?.kind === "photo" && Array.isArray(value.storageIds)) {
            const resolved = [];
            for (const sid of value.storageIds) {
              if (typeof sid !== "string") continue;
              const url = await ctx.storage.getUrl(sid as Id<"_storage">);
              resolved.push({ storageId: sid, url });
            }
            photoUrls[fieldId] = resolved;
          }
        }
        detail = { ...response, photoUrls };
      }
    }

    // Cylinders (concrete only).
    const cylinderSets: (Doc<"concreteCylinderSets"> & {
      cylinders: Doc<"concreteCylinders">[];
    })[] = [];
    if (report.kind === "concrete_field") {
      const sets = await ctx.db
        .query("concreteCylinderSets")
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .take(20);
      for (const s of sets) {
        const cyls = await ctx.db
          .query("concreteCylinders")
          .withIndex("by_set", (q) => q.eq("setId", s._id))
          .take(20);
        cylinderSets.push({ ...s, cylinders: cyls });
      }
    }

    // Nuclear density readings.
    let densityReadings: Doc<"nuclearDensityReadings">[] = [];
    if (report.kind === "nuclear_density") {
      densityReadings = await ctx.db
        .query("nuclearDensityReadings")
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .take(50);
    }

    // DCP layers.
    let dcpLayers: Doc<"dcpLayers">[] = [];
    if (report.kind === "dcp") {
      dcpLayers = await ctx.db
        .query("dcpLayers")
        .withIndex("by_test_and_sequence", (q) =>
          q.eq("dcpTestId", report.detailId as Id<"dcpTests">),
        )
        .take(50);
    }

    // Attachments.
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_parent", (q) =>
        q.eq("parentKind", "report").eq("parentId", reportId),
      )
      .take(50);

    // Resolve attachment URLs.
    const attachmentsWithUrls = [];
    for (const a of attachments) {
      const url = await ctx.storage.getUrl(a.storageId);
      attachmentsWithUrls.push({ ...a, url });
    }

    // Audit log — resolve actor names.
    const rawAuditLog = await ctx.db
      .query("reportAuditLog")
      .withIndex("by_report_and_at", (q) => q.eq("reportId", reportId))
      .order("desc")
      .take(50);

    const auditLog = [];
    for (const entry of rawAuditLog) {
      let actorName: string | null = null;
      if (entry.actorUserId) {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", entry.actorUserId!))
          .unique();
        actorName = profile?.fullName ?? null;
      }
      auditLog.push({ ...entry, actorName: actorName ?? entry.actorLabel ?? "System" });
    }

    // Approval info (if approved).
    let approval = null;
    if (report.approvalId) {
      const raw = await ctx.db.get("reportApprovals", report.approvalId);
      if (raw) {
        const sigUrl = await ctx.storage.getUrl(raw.signatureStorageId);
        const approver = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", raw.approvedByUserId))
          .unique();
        approval = {
          ...raw,
          signatureUrl: sigUrl,
          approverName: approver?.fullName ?? "Unknown",
        };
      }
    }

    // Portal tokens (for delivered reports — show the portal links).
    const portalTokens = await ctx.db
      .query("portalTokens")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .take(50);

    const portalTokensWithContacts = [];
    for (const pt of portalTokens) {
      const contact = await ctx.db.get("clientContacts", pt.clientContactId);
      portalTokensWithContacts.push({
        token: pt.token,
        contactName: contact?.fullName ?? "Unknown",
        contactEmail: contact?.email ?? "",
        accessCount: pt.accessCount,
        firstAccessedAt: pt.firstAccessedAt,
      });
    }

    // PDF URL.
    let pdfUrl: string | null = null;
    if (report.pdfStorageId) {
      pdfUrl = await ctx.storage.getUrl(report.pdfStorageId);
    }

    return {
      report,
      project,
      creatorName: creator?.fullName ?? "Unknown",
      reviewerName,
      rejectedByName,
      detail,
      cylinderSets,
      attachments: attachmentsWithUrls,
      auditLog,
      approval,
      portalTokens: portalTokensWithContacts,
      pdfUrl,
      densityReadings,
      dcpLayers,
      pileLoadIncrements: report.kind === "pile_load"
        ? await ctx.db.query("pileLoadIncrements")
            .withIndex("by_test_and_sequence", (q) =>
              q.eq("pileLoadTestId", report.detailId as Id<"pileLoadTests">))
            .take(50)
        : [],
      pileLoadReadings: report.kind === "pile_load"
        ? await ctx.db.query("pileLoadReadings")
            .withIndex("by_report", (q) => q.eq("reportId", reportId))
            .take(500)
        : [],
    };
  },
});

// ---------- Review queue query (M4) ----------

/** Reports awaiting review (submitted + in_review). Gated on canApproveReports. */
export const listReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requirePermission(ctx, "canApproveReports");

    const submitted = await ctx.db
      .query("reports")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "submitted"),
      )
      .order("asc")
      .take(100);

    const inReview = await ctx.db
      .query("reports")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "in_review"),
      )
      .order("asc")
      .take(100);

    const all = [...submitted, ...inReview];

    const result = [];
    for (const r of all) {
      const project = await ctx.db.get("projects", r.projectId);
      const creator = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", r.createdByUserId))
        .unique();
      let reviewerName: string | null = null;
      if (r.reviewingUserId) {
        const reviewer = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", r.reviewingUserId!))
          .unique();
        reviewerName = reviewer?.fullName ?? null;
      }
      let templateName: string | null = null;
      if (r.kind === "custom") {
        const response = await ctx.db.get(
          "customTestResponses",
          r.detailId as Id<"customTestResponses">,
        );
        templateName = response?.templateNameAtCreation ?? null;
      }
      result.push({
        ...r,
        projectName: project?.name ?? "Unknown",
        creatorName: creator?.fullName ?? "Unknown",
        reviewerName,
        templateName,
      });
    }
    return result;
  },
});

// ---------- Client portal dashboard query ----------

/** Approved/delivered reports for the current client user's company. */
export const listForClient = query({
  args: {},
  handler: async (ctx) => {
    const member = await requireMember(ctx);
    if (member.membership.role !== "client") {
      throw new ConvexError({ code: "FORBIDDEN" });
    }
    // clientId may not be set if the invitation didn't specify a company.
    if (!member.membership.clientId) {
      return [];
    }

    const clientId = member.membership.clientId;

    // Find all projects belonging to this client.
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .take(200);

    const result = [];
    for (const project of projects) {
      if (project.orgId !== member.org._id) continue;

      const approved = await ctx.db
        .query("reports")
        .withIndex("by_project_and_status", (q) =>
          q.eq("projectId", project._id).eq("status", "approved"),
        )
        .order("desc")
        .take(100);

      const delivered = await ctx.db
        .query("reports")
        .withIndex("by_project_and_status", (q) =>
          q.eq("projectId", project._id).eq("status", "delivered"),
        )
        .order("desc")
        .take(100);

      for (const r of [...approved, ...delivered]) {
        let pdfUrl: string | null = null;
        if (r.pdfStorageId) {
          pdfUrl = await ctx.storage.getUrl(r.pdfStorageId);
        }
        let templateName: string | null = null;
        if (r.kind === "custom") {
          const response = await ctx.db.get(
            "customTestResponses",
            r.detailId as Id<"customTestResponses">,
          );
          templateName = response?.templateNameAtCreation ?? null;
        }
        result.push({
          _id: r._id,
          kind: r.kind,
          number: r.number,
          status: r.status,
          fieldDate: r.fieldDate,
          approvedAt: r.approvedAt,
          deliveredAt: r.deliveredAt,
          pdfUrl,
          projectName: project.name,
          projectId: project._id,
          jobNumber: project.jobNumber,
          templateName,
        });
      }
    }

    // Sort by approvedAt descending.
    result.sort((a, b) => (b.approvedAt ?? 0) - (a.approvedAt ?? 0));
    return result;
  },
});

// ---------- Admin executive dashboard stats ----------

/**
 * Org-wide audit log for compliance / history review. Admin only.
 * Returns the most recent 200 events with joined actor names + report
 * numbers for display.
 */
export const listOrgAuditLog = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    const entries = await ctx.db
      .query("reportAuditLog")
      .withIndex("by_org_and_at", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(200);

    const out = [];
    for (const e of entries) {
      const actor = e.actorUserId
        ? await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) =>
              q.eq("userId", e.actorUserId as Id<"users">),
            )
            .unique()
        : null;
      const report = await ctx.db.get("reports", e.reportId);
      let templateName: string | null = null;
      if (report?.kind === "custom") {
        const response = await ctx.db.get(
          "customTestResponses",
          report.detailId as Id<"customTestResponses">,
        );
        templateName = response?.templateNameAtCreation ?? null;
      }
      out.push({
        _id: e._id,
        at: e.at,
        event: e.event,
        actorName: actor?.fullName ?? e.actorLabel ?? "System",
        reportId: e.reportId,
        reportNumber: report?.number ?? "—",
        reportKind: report?.kind ?? "",
        reportTemplateName: templateName,
        metadata: e.metadata,
      });
    }
    return out;
  },
});

/** Ops metrics for the admin dashboard. Returns volume, turnaround, queue depth, rejection rate, prior-period deltas, and a 7×24 hour-of-week delivery heatmap. */
export const getAdminDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    const now = Date.now();
    const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
    const windowStart = now - WINDOW_MS;
    const priorWindowStart = now - 2 * WINDOW_MS;

    // 1. Delivered reports — fetch enough to cover both windows (~60 days worth).
    const delivered = await ctx.db
      .query("reports")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "delivered"),
      )
      .order("desc")
      .take(1000);

    const recentDelivered = delivered.filter(
      (r) => r.deliveredAt && r.deliveredAt >= windowStart,
    );
    const priorDelivered = delivered.filter(
      (r) =>
        r.deliveredAt &&
        r.deliveredAt >= priorWindowStart &&
        r.deliveredAt < windowStart,
    );

    // Group by kind + compute turnaround for the current window
    const kindCounts: Record<string, number> = {};
    let totalTurnaround = 0;
    let turnaroundCount = 0;

    for (const r of recentDelivered) {
      kindCounts[r.kind] = (kindCounts[r.kind] ?? 0) + 1;
      if (r.deliveredAt && r.fieldDate) {
        totalTurnaround += r.deliveredAt - r.fieldDate;
        turnaroundCount++;
      }
    }

    const deliveredByKind = Object.entries(kindCounts)
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count);

    const avgTurnaroundHours =
      turnaroundCount > 0
        ? Math.round((totalTurnaround / turnaroundCount / (1000 * 60 * 60)) * 10) / 10
        : null;

    // Prior-period turnaround (for delta comparison)
    let priorTurnaround = 0;
    let priorTurnaroundCount = 0;
    for (const r of priorDelivered) {
      if (r.deliveredAt && r.fieldDate) {
        priorTurnaround += r.deliveredAt - r.fieldDate;
        priorTurnaroundCount++;
      }
    }
    const prevAvgTurnaroundHours =
      priorTurnaroundCount > 0
        ? Math.round((priorTurnaround / priorTurnaroundCount / (1000 * 60 * 60)) * 10) / 10
        : null;

    // 2. Heatmap: 7 rows (0=Sunday .. 6=Saturday) × 24 hours, cell = delivery count
    const heatmapCells: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0),
    );
    let heatmapMax = 0;
    for (const r of recentDelivered) {
      if (!r.deliveredAt) continue;
      const d = new Date(r.deliveredAt);
      const day = d.getDay(); // 0–6
      const hour = d.getHours(); // 0–23
      heatmapCells[day][hour] += 1;
      if (heatmapCells[day][hour] > heatmapMax) {
        heatmapMax = heatmapCells[day][hour];
      }
    }

    // 3. Review queue depth
    const submitted = await ctx.db
      .query("reports")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "submitted"),
      )
      .take(200);

    const inReview = await ctx.db
      .query("reports")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "in_review"),
      )
      .take(200);

    // 4. Rejection rate from audit log — current window + prior window
    const recentAudit = await ctx.db
      .query("reportAuditLog")
      .withIndex("by_org_and_at", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(2000);

    let rejectedCount = 0;
    let approvedCount = 0;
    let priorRejectedCount = 0;
    let priorApprovedCount = 0;
    for (const e of recentAudit) {
      if (e.at < priorWindowStart) break;
      if (e.at >= windowStart) {
        if (e.event === "rejected") rejectedCount++;
        if (e.event === "approved") approvedCount++;
      } else {
        if (e.event === "rejected") priorRejectedCount++;
        if (e.event === "approved") priorApprovedCount++;
      }
    }
    const totalDecisions = rejectedCount + approvedCount;
    const priorTotalDecisions = priorRejectedCount + priorApprovedCount;

    return {
      windowStart,
      windowEnd: now,
      deliveredCount: recentDelivered.length,
      prevDeliveredCount: priorDelivered.length,
      deliveredByKind,
      avgTurnaroundHours,
      prevAvgTurnaroundHours,
      heatmap: { cells: heatmapCells, max: heatmapMax },
      queueDepth: submitted.length + inReview.length,
      submittedCount: submitted.length,
      inReviewCount: inReview.length,
      rejectionRate:
        totalDecisions > 0
          ? Math.round((rejectedCount / totalDecisions) * 1000) / 10
          : null,
      prevRejectionRate:
        priorTotalDecisions > 0
          ? Math.round((priorRejectedCount / priorTotalDecisions) * 1000) / 10
          : null,
      rejectedCount,
      approvedCount,
    };
  },
});
