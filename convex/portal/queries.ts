import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Public query — no auth required. Loads a report via a portal token.
 * Returns a hand-shaped DTO with NO internal fields (no orgId, no
 * userIds, no internal audit). This is the only data a client sees.
 */
export const getReportByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const portalToken = await ctx.db
      .query("portalTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!portalToken) return { state: "not_found" as const };
    if (portalToken.revokedAt) return { state: "revoked" as const };
    if (portalToken.expiresAt < Date.now()) return { state: "expired" as const };

    const report = await ctx.db.get("reports", portalToken.reportId);
    if (!report) return { state: "not_found" as const };

    // Defense-in-depth: only serve approved/delivered reports.
    if (report.status !== "approved" && report.status !== "delivered") {
      return { state: "not_found" as const };
    }

    const project = await ctx.db.get("projects", report.projectId);
    const org = await ctx.db.get("orgs", report.orgId);

    // Load detail
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
      detail = await ctx.db.get(
        "customTestResponses",
        report.detailId as Id<"customTestResponses">,
      );
    }

    // Load cylinders
    const cylinderSets = [];
    if (report.kind === "concrete_field") {
      const sets = await ctx.db
        .query("concreteCylinderSets")
        .withIndex("by_report", (q) => q.eq("reportId", report._id))
        .take(20);
      for (const s of sets) {
        const cyls = await ctx.db
          .query("concreteCylinders")
          .withIndex("by_set", (q) => q.eq("setId", s._id))
          .take(20);
        cylinderSets.push({
          setLabel: s.setLabel,
          cylinders: cyls.map((c) => ({
            cylinderNumber: c.cylinderNumber,
            breakAgeDays: c.breakAgeDays,
            strengthPsi: c.strengthPsi,
            fractureType: c.fractureType,
          })),
        });
      }
    }

    // PDF URL
    let pdfUrl: string | null = null;
    if (report.pdfStorageId) {
      pdfUrl = await ctx.storage.getUrl(report.pdfStorageId);
    }

    // Approval info (signature URL + approver name for display)
    let approvalInfo = null;
    if (report.approvalId) {
      const approval = await ctx.db.get("reportApprovals", report.approvalId);
      if (approval) {
        const sigUrl = await ctx.storage.getUrl(approval.signatureStorageId);
        const approverProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", approval.approvedByUserId))
          .first();
        approvalInfo = {
          approvedAt: approval.approvedAt,
          signatureUrl: sigUrl,
          comments: approval.comments,
          approvedByName: approverProfile?.fullName ?? null,
          peLicenseNumber: approval.peLicenseNumberAtTime ?? null,
          peState: approval.peStateAtTime ?? null,
        };
      }
    }

    const templateName: string | null =
      report.kind === "custom" && detail
        ? ((detail as { templateNameAtCreation?: string })
            .templateNameAtCreation ?? null)
        : null;

    return {
      state: "ok" as const,
      orgName: org?.displayName ?? "Unknown",
      projectName: project?.name ?? "Unknown",
      jobNumber: project?.jobNumber ?? "",
      reportNumber: report.number,
      kind: report.kind,
      templateName,
      status: report.status,
      fieldDate: report.fieldDate,
      weather: report.weather,
      locationNote: report.locationNote,
      stationFrom: report.stationFrom,
      stationTo: report.stationTo,
      detail,
      cylinderSets,
      pdfUrl,
      approvalInfo,
    };
  },
});
