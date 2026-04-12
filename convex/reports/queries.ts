import { v, ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { requireMember, requireRole, requireInternal, requireProjectAccess, orgScoped } from "../lib/auth";

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

    // Resolve creator names for the list view.
    const result = [];
    for (const r of reports) {
      const creator = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", r.createdByUserId))
        .unique();
      result.push({ ...r, creatorName: creator?.fullName ?? "Unknown" });
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
      result.push({ ...r, projectName: project?.name ?? "Unknown" });
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
      result.push({ ...r, projectName: project?.name ?? "Unknown" });
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
      result.push({ ...r, projectName: project?.name ?? "Unknown" });
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

/** Reports awaiting review (submitted + in_review). PM/admin only. */
export const listReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["pm", "admin"]);

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
      result.push({
        ...r,
        projectName: project?.name ?? "Unknown",
        creatorName: creator?.fullName ?? "Unknown",
        reviewerName,
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
        });
      }
    }

    // Sort by approvedAt descending.
    result.sort((a, b) => (b.approvedAt ?? 0) - (a.approvedAt ?? 0));
    return result;
  },
});

// ---------- Admin executive dashboard stats ----------

/** Ops metrics for the admin dashboard. Returns volume, turnaround, queue depth, and rejection rate. */
export const getAdminDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, ["admin"]);
    const now = Date.now();
    const windowStart = now - 30 * 24 * 60 * 60 * 1000;

    // 1. Delivered reports in the last 30 days
    const delivered = await ctx.db
      .query("reports")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "delivered"),
      )
      .order("desc")
      .take(500);

    const recentDelivered = delivered.filter(
      (r) => r.deliveredAt && r.deliveredAt >= windowStart,
    );

    // Group by kind + compute turnaround
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

    // 2. Review queue depth
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

    // 3. Rejection rate from audit log (last 30 days)
    const recentAudit = await ctx.db
      .query("reportAuditLog")
      .withIndex("by_org_and_at", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(1000);

    let rejectedCount = 0;
    let approvedCount = 0;
    for (const e of recentAudit) {
      if (e.at < windowStart) break;
      if (e.event === "rejected") rejectedCount++;
      if (e.event === "approved") approvedCount++;
    }
    const totalDecisions = rejectedCount + approvedCount;

    return {
      windowStart,
      windowEnd: now,
      deliveredCount: recentDelivered.length,
      deliveredByKind,
      avgTurnaroundHours,
      queueDepth: submitted.length + inReview.length,
      submittedCount: submitted.length,
      inReviewCount: inReview.length,
      rejectionRate:
        totalDecisions > 0
          ? Math.round((rejectedCount / totalDecisions) * 1000) / 10
          : null,
      rejectedCount,
      approvedCount,
    };
  },
});
