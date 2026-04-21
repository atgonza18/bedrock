import { v, ConvexError } from "convex/values";
import { seedProjectFieldValues } from "../lib/customTemplates";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { requireRole, requireInternal, requirePermission, requireProjectAccess, requireOwnership, orgScoped } from "../lib/auth";
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
    // Required when kind === "custom". Snapshots the template onto the response.
    templateId: v.optional(v.id("testTemplates")),
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
      | Id<"pileLoadTests">
      | Id<"customTestResponses">;
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
    } else if (args.kind === "custom") {
      if (!args.templateId) {
        throw new ConvexError({ code: "TEMPLATE_REQUIRED" });
      }
      const template = orgScoped(
        org._id,
        await ctx.db.get("testTemplates", args.templateId),
      );
      if (template.status !== "active") {
        throw new ConvexError({ code: "TEMPLATE_NOT_ACTIVE" });
      }
      // Seed values for any text fields whose label looks like a project
      // identifier so techs don't have to re-type info the system already knows.
      const project = await ctx.db.get("projects", args.projectId);
      const valuesJson = seedProjectFieldValues(template.fieldsJson, project);
      detailId = await ctx.db.insert("customTestResponses", {
        orgId: org._id,
        templateId: args.templateId,
        // Snapshot the template at creation time so later edits don't mutate
        // this submission retroactively.
        templateNameAtCreation: template.name,
        templateFieldsJson: template.fieldsJson,
        valuesJson,
      });
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
    } else if (args.kind === "custom") {
      await ctx.db.patch("customTestResponses", detailId as Id<"customTestResponses">, { reportId });
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
        } else if (report.kind === "custom") {
          // Only valuesJson is writable for a custom response (name and fields
          // are frozen snapshots). Reject other keys so a malformed client
          // can't rewrite the snapshot.
          const allowed: Record<string, unknown> = {};
          if (typeof detailPatch.valuesJson === "string") {
            allowed.valuesJson = detailPatch.valuesJson;
          }
          if (Object.keys(allowed).length > 0) {
            await ctx.db.patch(
              report.detailId as Id<"customTestResponses">,
              allowed,
            );
          }
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

    // Notify every PM / admin so they see the report in their queue.
    // Fire-and-forget via scheduler — no-ops if VAPID isn't configured.
    const reviewers = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org_and_userId", (q) => q.eq("orgId", org._id))
      .collect();
    for (const m of reviewers) {
      if (m.role !== "pm" && m.role !== "admin") continue;
      if (m.userId === userId) continue;
      await ctx.scheduler.runAfter(0, internal.notifications.sendToUser, {
        userId: m.userId,
        title: `Report ${report.number} submitted for review`,
        body: "A field report is ready for your approval.",
        url: `/app/queue`,
        tag: `report-${reportId}`,
      });
    }
  },
});

// ---------- Review mutations (M4) ----------

/**
 * PM claims a submitted report for review. Transitions submitted → in_review.
 */
export const claimForReview = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const { org, userId } = await requirePermission(ctx, "canApproveReports");
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
    const { org, userId } = await requirePermission(ctx, "canApproveReports");
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

    // Let the tech know immediately.
    await ctx.scheduler.runAfter(0, internal.notifications.sendToUser, {
      userId: report.createdByUserId,
      title: `Report ${report.number} needs changes`,
      body: reason.length > 100 ? reason.slice(0, 97) + "…" : reason,
      url: `/app/reports/${reportId}`,
      tag: `report-${reportId}`,
    });
  },
});

/**
 * PM approves a report. Captures the signature as a storage file,
 * creates a reportApprovals record, and transitions in_review → approved.
 */
export const approve = mutation({
  args: {
    reportId: v.id("reports"),
    /** Fresh-drawn signature for this approval. If omitted, the PM's
     *  signature-on-file is used. If neither exists, the mutation errors. */
    signatureStorageId: v.optional(v.id("_storage")),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, signatureStorageId, comments }) => {
    const { org, userId, profile } = await requirePermission(ctx, "canApproveReports");
    const report = orgScoped(org._id, await ctx.db.get("reports", reportId));

    assertTransition(report.status, "approved");

    const finalSignatureId = signatureStorageId ?? profile.signatureStorageId;
    if (!finalSignatureId) {
      throw new Error(
        "No signature provided and no signature on file. Add a signature in your profile.",
      );
    }

    const approvalId = await ctx.db.insert("reportApprovals", {
      orgId: org._id,
      reportId,
      approvedByUserId: userId,
      approvedAt: Date.now(),
      comments,
      signatureStorageId: finalSignatureId,
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

    // Notify the tech.
    await ctx.scheduler.runAfter(0, internal.notifications.sendToUser, {
      userId: report.createdByUserId,
      title: `Report ${report.number} approved`,
      body: "Your report has been approved and is being delivered.",
      url: `/app/reports/${reportId}`,
      tag: `report-${reportId}`,
    });
  },
});

// ---------- Duplicate ----------

/**
 * Create a new draft report by copying the parent-level fields and the
 * kind-specific detail row from an existing report. Photos and child
 * collections (cylinders, density readings, etc.) are intentionally
 * NOT copied — those are specific to each test event.
 *
 * Useful when testing sequential trucks of the same mix design, or
 * running repeat density tests with the same gauge.
 */
export const duplicate = mutation({
  args: {
    sourceReportId: v.id("reports"),
  },
  handler: async (ctx, { sourceReportId }): Promise<Id<"reports">> => {
    const member = await requireInternal(ctx);
    const { org, userId } = member;
    const source = orgScoped(
      org._id,
      await ctx.db.get("reports", sourceReportId),
    );
    await requireProjectAccess(ctx, member, source.projectId);

    const number = await nextReportNumber(ctx, org._id);

    // Copy the kind-specific detail.
    const stripSystem = (obj: any) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === "_id" || k === "_creationTime" || k === "reportId") continue;
        out[k] = v;
      }
      return out;
    };

    let detailId:
      | Id<"concreteFieldTests">
      | Id<"nuclearDensityTests">
      | Id<"proofRollObservations">
      | Id<"dcpTests">
      | Id<"pileLoadTests">;

    if (source.kind === "concrete_field") {
      const src = await ctx.db.get(source.detailId as Id<"concreteFieldTests">);
      const copy = src ? stripSystem(src) : { orgId: org._id };
      detailId = await ctx.db.insert("concreteFieldTests", copy as any);
    } else if (source.kind === "nuclear_density") {
      const src = await ctx.db.get(source.detailId as Id<"nuclearDensityTests">);
      const copy = src ? stripSystem(src) : { orgId: org._id };
      detailId = await ctx.db.insert("nuclearDensityTests", copy as any);
    } else if (source.kind === "proof_roll") {
      const src = await ctx.db.get(source.detailId as Id<"proofRollObservations">);
      const copy = src ? stripSystem(src) : { orgId: org._id };
      detailId = await ctx.db.insert("proofRollObservations", copy as any);
    } else if (source.kind === "dcp") {
      const src = await ctx.db.get(source.detailId as Id<"dcpTests">);
      const copy = src ? stripSystem(src) : { orgId: org._id };
      detailId = await ctx.db.insert("dcpTests", copy as any);
    } else if (source.kind === "pile_load") {
      const src = await ctx.db.get(source.detailId as Id<"pileLoadTests">);
      const copy = src ? stripSystem(src) : { orgId: org._id };
      detailId = await ctx.db.insert("pileLoadTests", copy as any);
    } else {
      throw new ConvexError({ code: "UNSUPPORTED_KIND", kind: source.kind });
    }

    // Create the new draft report, copying parent-level context.
    const reportId = await ctx.db.insert("reports", {
      orgId: org._id,
      projectId: source.projectId,
      kind: source.kind,
      status: "draft",
      number,
      createdByUserId: userId,
      fieldDate: Date.now(), // default to today — tech will adjust
      specZoneId: source.specZoneId,
      weather: source.weather,
      locationNote: source.locationNote,
      stationFrom: source.stationFrom,
      stationTo: source.stationTo,
      detailId,
    });

    // Close the bidirectional link.
    if (source.kind === "concrete_field") {
      await ctx.db.patch("concreteFieldTests", detailId as Id<"concreteFieldTests">, { reportId });
    } else if (source.kind === "nuclear_density") {
      await ctx.db.patch("nuclearDensityTests", detailId as Id<"nuclearDensityTests">, { reportId });
    } else if (source.kind === "proof_roll") {
      await ctx.db.patch("proofRollObservations", detailId as Id<"proofRollObservations">, { reportId });
    } else if (source.kind === "dcp") {
      await ctx.db.patch("dcpTests", detailId as Id<"dcpTests">, { reportId });
    } else if (source.kind === "pile_load") {
      await ctx.db.patch("pileLoadTests", detailId as Id<"pileLoadTests">, { reportId });
    }

    await appendAudit(
      ctx,
      org._id,
      reportId,
      userId,
      "created",
      JSON.stringify({ duplicatedFrom: sourceReportId }),
    );

    return reportId;
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
