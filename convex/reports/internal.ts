import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Loads the full data bundle needed to render a PDF and deliver a report.
 * Called from the deliver action via ctx.runQuery.
 */
export const loadForDelivery = internalQuery({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await ctx.db.get("reports", reportId);
    if (!report) throw new Error("Report not found");

    const org = await ctx.db.get("orgs", report.orgId);
    if (!org) throw new Error("Org not found");

    const project = await ctx.db.get("projects", report.projectId);
    if (!project) throw new Error("Project not found");

    const creator = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", report.createdByUserId))
      .unique();

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
    }

    // Load cylinders
    const cylinderSets = [];
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

    // Load approval + signature URL
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
          signatureUrl: sigUrl,
          approverName: approver?.fullName ?? "Unknown",
          approvedAt: raw.approvedAt,
          comments: raw.comments,
        };
      }
    }

    // Nuclear density readings
    let densityReadings: any[] = [];
    if (report.kind === "nuclear_density") {
      densityReadings = await ctx.db
        .query("nuclearDensityReadings")
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .take(50);
    }

    // DCP layers
    let dcpLayers: any[] = [];
    if (report.kind === "dcp") {
      dcpLayers = await ctx.db
        .query("dcpLayers")
        .withIndex("by_test_and_sequence", (q) =>
          q.eq("dcpTestId", report.detailId as Id<"dcpTests">),
        )
        .take(50);
    }

    // Spec zone lookup
    let specZone: { name: string; specMinCompactionPct?: number; specMinConcreteStrengthPsi?: number; specPileDesignLoadKips?: number } | null = null;
    if (report.specZoneId) {
      const z = await ctx.db.get("projectSpecZones", report.specZoneId);
      if (z) {
        specZone = {
          name: z.name,
          specMinCompactionPct: z.specMinCompactionPct,
          specMinConcreteStrengthPsi: z.specMinConcreteStrengthPsi,
          specPileDesignLoadKips: z.specPileDesignLoadKips,
        };
      }
    }

    // Pile type info
    let pileTypeInfo: { name: string; color: string } | null = null;
    if (report.kind === "pile_load" && detail?.pileTypeId) {
      const pt = await ctx.db.get("projectPileTypes", detail.pileTypeId);
      if (pt) {
        pileTypeInfo = { name: pt.name, color: pt.color };
      }
    }

    // Load photo attachments
    const attachmentRows = await ctx.db
      .query("attachments")
      .withIndex("by_parent", (q) => q.eq("parentKind", "report").eq("parentId", reportId as string))
      .take(20);

    const photoUrls: { fileName: string; url: string }[] = [];
    for (const att of attachmentRows) {
      if (att.contentType.startsWith("image/")) {
        const url = await ctx.storage.getUrl(att.storageId);
        if (url) {
          photoUrls.push({ fileName: att.fileName, url });
        }
      }
    }

    // Default recipients
    const recipients = [];
    for (const contactId of project.defaultRecipientContactIds) {
      const contact = await ctx.db.get("clientContacts", contactId);
      if (contact && contact.isActive) recipients.push(contact);
    }

    return {
      org: {
        _id: org._id,
        displayName: org.displayName,
        logoUrl: org.logoStorageId
          ? await ctx.storage.getUrl(org.logoStorageId)
          : null,
      },
      project: { _id: project._id, name: project.name, jobNumber: project.jobNumber },
      report,
      creatorName: creator?.fullName ?? "Unknown",
      detail,
      cylinderSets,
      densityReadings,
      dcpLayers,
      pileLoadIncrements: report.kind === "pile_load"
        ? await ctx.db.query("pileLoadIncrements")
            .withIndex("by_test_and_sequence", (q) =>
              q.eq("pileLoadTestId", report.detailId as Id<"pileLoadTests">))
            .take(50)
        : [],
      approval,
      specZone,
      pileTypeInfo,
      photoUrls,
      recipients,
    };
  },
});

/**
 * Marks a report as delivered and stores the PDF reference.
 */
export const markDelivered = internalMutation({
  args: {
    reportId: v.id("reports"),
    pdfStorageId: v.id("_storage"),
  },
  handler: async (ctx, { reportId, pdfStorageId }) => {
    await ctx.db.patch("reports", reportId, {
      status: "delivered",
      deliveredAt: Date.now(),
      pdfStorageId,
    });
    const report = await ctx.db.get("reports", reportId);
    if (report) {
      await ctx.db.insert("reportAuditLog", {
        orgId: report.orgId,
        reportId,
        at: Date.now(),
        actorLabel: "system",
        event: "pdf_generated",
      });
    }
  },
});

/**
 * Updates a reportDeliveries record after an email send attempt.
 * Sets status to "sent" (with sentAt timestamp) or "failed" (with lastError).
 */
export const updateDeliveryStatus = internalMutation({
  args: {
    reportId: v.id("reports"),
    portalTokenId: v.id("portalTokens"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, portalTokenId, status, lastError }) => {
    const deliveries = await ctx.db
      .query("reportDeliveries")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .take(100);
    const delivery = deliveries.find((d) => d.portalTokenId === portalTokenId);
    if (!delivery) return;
    await ctx.db.patch("reportDeliveries", delivery._id, {
      status,
      sentAt: status === "sent" ? Date.now() : undefined,
      lastError: lastError ?? undefined,
    });
  },
});

/**
 * Logs an audit event for email delivery (sent or failed).
 */
export const logEmailAuditEvent = internalMutation({
  args: {
    reportId: v.id("reports"),
    event: v.union(v.literal("email_sent"), v.literal("email_failed")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, event, metadata }) => {
    const report = await ctx.db.get("reports", reportId);
    if (!report) return;
    await ctx.db.insert("reportAuditLog", {
      orgId: report.orgId,
      reportId,
      at: Date.now(),
      actorLabel: "system",
      event,
      metadata,
    });
  },
});
