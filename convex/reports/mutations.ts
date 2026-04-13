import { v, ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { requireRole, requireInternal, requireProjectAccess, requireOwnership, orgScoped } from "../lib/auth";
import { reportKind } from "../schema";
import { assertTransition } from "./transitions";
import { nextReportNumber } from "./numbers";

// ---------- Helpers ----------

async function appendAudit(
  ctx: { db: any },
  orgId: Id<"orgs">,
  reportId: Id<"reports">,
  actorUserId: Id<"users">,
  event: string,
  metadata?: string,
) {
  await ctx.db.insert("reportAuditLog", {
    orgId,
    reportId,
    at: Date.now(),
    actorUserId,
    actorLabel: undefined,
    event,
    metadata,
  });
}

// ---------- Mutations ----------

/**
 * Creates a new report draft. Inserts the detail row (e.g.,
 * concreteFieldTests) first, then the parent `reports` row, then patches
 * the detail with `reportId` to close the bidirectional link.
 *
 * Returns the new report's _id so the frontend can redirect to the edit page.
 */
export const createDraft = mutation({
  args: {
    projectId: v.id("projects"),
    kind: reportKind,
    fieldDate: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"reports">> => {
    const member = await requireInternal(ctx);
    const { org, userId } = member;
    orgScoped(org._id, await ctx.db.get("projects", args.projectId));
    await requireProjectAccess(ctx, member, args.projectId);

    const number = await nextReportNumber(ctx, org._id);

    let detailId:
      | Id<"concreteFieldTests">
      | Id<"nuclearDensityTests">
      | Id<"proofRollObservations">
      | Id<"dcpTests">
      | Id<"pileLoadTests">;
    if (args.kind === "concrete_field") {
      detailId = await ctx.db.insert("concreteFieldTests", { orgId: org._id });
    } else if (args.kind === "nuclear_density") {
      detailId = await ctx.db.insert("nuclearDensityTests", { orgId: org._id });
    } else if (args.kind === "proof_roll") {
      detailId = await ctx.db.insert("proofRollObservations", { orgId: org._id });
    } else if (args.kind === "dcp") {
      detailId = await ctx.db.insert("dcpTests", { orgId: org._id });
    } else if (args.kind === "pile_load") {
      detailId = await ctx.db.insert("pileLoadTests", { orgId: org._id });
    } else {
      throw new ConvexError({ code: "UNSUPPORTED_KIND", kind: args.kind });
    }

    const reportId = await ctx.db.insert("reports", {
      orgId: org._id,
      projectId: args.projectId,
      kind: args.kind,
      status: "draft",
      number,
      createdByUserId: userId,
      fieldDate: args.fieldDate,
      detailId,
    });

    // Close the bidirectional link.
    if (args.kind === "concrete_field") {
      await ctx.db.patch("concreteFieldTests", detailId as Id<"concreteFieldTests">, { reportId });
    } else if (args.kind === "nuclear_density") {
      await ctx.db.patch("nuclearDensityTests", detailId as Id<"nuclearDensityTests">, { reportId });
    } else if (args.kind === "proof_roll") {
      await ctx.db.patch("proofRollObservations", detailId as Id<"proofRollObservations">, { reportId });
    } else if (args.kind === "dcp") {
      await ctx.db.patch("dcpTests", detailId as Id<"dcpTests">, { reportId });
    } else if (args.kind === "pile_load") {
      await ctx.db.patch("pileLoadTests", detailId as Id<"pileLoadTests">, { reportId });
    }

    await appendAudit(ctx, org._id, reportId, userId, "created");

    return reportId;
  },
});

/**
 * Saves draft changes. Accepts partial updates for both the parent
 * `reports` row and the kind-specific detail row. Only allowed when the
 * report is in `draft` or `rejected` status (tech is editing).
 */
export const updateDraft = mutation({
  args: {
    reportId: v.id("reports"),
    // Parent fields
    fieldDate: v.optional(v.number()),
    weather: v.optional(
      v.object({
        tempF: v.optional(v.number()),
        conditions: v.optional(v.string()),
        windMph: v.optional(v.number()),
      }),
    ),
    locationNote: v.optional(v.string()),
    stationFrom: v.optional(v.string()),
    stationTo: v.optional(v.string()),
    specZoneId: v.optional(v.id("projectSpecZones")),
    // Kind-specific detail — a generic record. The frontend sends only
    // fields matching the report's kind. We trust the shape because Convex
    // schema validation catches type mismatches at write time.
    detail: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, { reportId, detail, ...parentUpdates }) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));
    requireOwnership(member, report);

    if (report.status !== "draft" && report.status !== "rejected") {
      throw new ConvexError({
        code: "NOT_EDITABLE",
        status: report.status,
      });
    }

    // Patch parent
    const parentPatch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(parentUpdates)) {
      if (val !== undefined) parentPatch[k] = val;
    }
    if (Object.keys(parentPatch).length > 0) {
      await ctx.db.patch("reports", reportId, parentPatch);
    }

    // Patch kind-specific detail
    if (detail) {
      const detailPatch: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(detail)) {
        if (val !== undefined) detailPatch[k] = val;
      }
      if (Object.keys(detailPatch).length > 0) {
        if (report.kind === "concrete_field") {
          await ctx.db.patch("concreteFieldTests", report.detailId as Id<"concreteFieldTests">, detailPatch);
        } else if (report.kind === "nuclear_density") {
          await ctx.db.patch("nuclearDensityTests", report.detailId as Id<"nuclearDensityTests">, detailPatch);
        } else if (report.kind === "proof_roll") {
          await ctx.db.patch("proofRollObservations", report.detailId as Id<"proofRollObservations">, detailPatch);
        } else if (report.kind === "dcp") {
          await ctx.db.patch("dcpTests", report.detailId as Id<"dcpTests">, detailPatch);
        } else if (report.kind === "pile_load") {
          await ctx.db.patch("pileLoadTests", report.detailId as Id<"pileLoadTests">, detailPatch);
        }
      }
    }
  },
});

/**
 * Submits a draft for PM review. Transitions draft → submitted.
 */
export const submit = mutation({
  args: {
    reportId: v.id("reports"),
    resubmissionNote: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, resubmissionNote }) => {
    const member = await requireInternal(ctx);
    const { org, userId } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));
    requireOwnership(member, report);

    assertTransition(report.status, "submitted");

    await ctx.db.patch("reports", reportId, {
      status: "submitted",
      submittedAt: Date.now(),
      // Clear any previous rejection fields on re-submit.
      rejectedByUserId: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
    });

    await appendAudit(
      ctx, org._id, reportId, userId, "submitted",
      resubmissionNote ? JSON.stringify({ resubmissionNote }) : undefined,
    );
  },
});

// ---------- Review mutations (M4) ----------

/**
 * PM claims a submitted report for review. Transitions submitted → in_review.
 */
export const claimForReview = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const { org, userId } = await requireRole(ctx, ["pm", "admin"]);
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));

    assertTransition(report.status, "in_review");

    await ctx.db.patch("reports", reportId, {
      status: "in_review",
      reviewingUserId: userId,
      reviewingSince: Date.now(),
    });

    await appendAudit(ctx, org._id, reportId, userId, "claimed_for_review");
  },
});

/**
 * PM rejects a report back to the tech with comments.
 * Transitions in_review → rejected.
 */
export const rejectWithComments = mutation({
  args: {
    reportId: v.id("reports"),
    reason: v.string(),
  },
  handler: async (ctx, { reportId, reason }) => {
    const { org, userId } = await requireRole(ctx, ["pm", "admin"]);
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));

    assertTransition(report.status, "rejected");

    await ctx.db.patch("reports", reportId, {
      status: "rejected",
      rejectedByUserId: userId,
      rejectedAt: Date.now(),
      rejectionReason: reason,
      reviewingUserId: undefined,
      reviewingSince: undefined,
    });

    await appendAudit(
      ctx,
      org._id,
      reportId,
      userId,
      "rejected",
      JSON.stringify({ reason }),
    );
  },
});

/**
 * PM approves a report. Captures the signature as a storage file,
 * creates a reportApprovals record, and transitions in_review → approved.
 */
export const approve = mutation({
  args: {
    reportId: v.id("reports"),
    signatureStorageId: v.id("_storage"),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, signatureStorageId, comments }) => {
    const { org, userId, profile } = await requireRole(ctx, ["pm", "admin"]);
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));

    assertTransition(report.status, "approved");

    const approvalId = await ctx.db.insert("reportApprovals", {
      orgId: org._id,
      reportId,
      approvedByUserId: userId,
      approvedAt: Date.now(),
      comments,
      signatureStorageId,
      peSealStorageId: profile.sealStorageId ?? undefined,
      peLicenseNumberAtTime: profile.peLicenseNumber ?? undefined,
      peStateAtTime: undefined,
    });

    await ctx.db.patch("reports", reportId, {
      status: "approved",
      approvedByUserId: userId,
      approvedAt: Date.now(),
      approvalId,
      reviewingUserId: undefined,
      reviewingSince: undefined,
    });

    await appendAudit(ctx, org._id, reportId, userId, "approved");

    // Trigger automatic delivery (PDF generation + portal tokens).
    await ctx.scheduler.runAfter(0, internal.reports.deliver.deliver, {
      reportId,
    });
  },
});

// ---------- Archive & Restore ----------

/**
 * Soft-delete a report by moving it to "archived" status.
 * - Techs can archive their own drafts/rejected reports.
 * - PMs and admins can archive any report in any status.
 * The previous status is saved so the report can be restored.
 */
export const archive = mutation({
  args: {
    reportId: v.id("reports"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, reason }) => {
    const member = await requireInternal(ctx);
    const { org, userId } = member;
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));

    if (report.status === "archived") {
      return; // Already archived
    }

    // Permission check: techs can only archive their own draft/rejected reports
    const isTech = member.membership.role === "tech";
    if (isTech) {
      requireOwnership(member, report);
      if (report.status !== "draft" && report.status !== "rejected") {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Techs can only archive draft or rejected reports.",
        });
      }
    }
    // PMs and admins can archive any report (no additional check needed)

    assertTransition(report.status as any, "archived");

    await ctx.db.patch("reports", reportId, {
      status: "archived",
      archivedFromStatus: report.status,
      archivedAt: Date.now(),
      archivedByUserId: userId,
    });

    await appendAudit(
      ctx, org._id, reportId, userId, "archived",
      reason ? JSON.stringify({ reason }) : undefined,
    );
  },
});

/**
 * Restore an archived report to its previous status.
 * Only PMs and admins can restore.
 */
export const restore = mutation({
  args: {
    reportId: v.id("reports"),
  },
  handler: async (ctx, { reportId }) => {
    const { org, userId } = await requireRole(ctx, ["admin", "pm"]);
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));

    if (report.status !== "archived") {
      throw new ConvexError({
        code: "NOT_ARCHIVED",
        message: "Only archived reports can be restored.",
      });
    }

    const restoreTo = (report.archivedFromStatus ?? "draft") as "draft" | "submitted" | "in_review" | "rejected" | "approved" | "delivered";

    await ctx.db.patch("reports", reportId, {
      status: restoreTo,
      archivedFromStatus: undefined,
      archivedAt: undefined,
      archivedByUserId: undefined,
    });

    await appendAudit(
      ctx, org._id, reportId, userId, "restored",
      JSON.stringify({ restoredTo: restoreTo }),
    );
  },
});
