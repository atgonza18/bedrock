"use node";

import { v, ConvexError } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { renderReportPdf, DeliveryBundle } from "../pdf/renderer";
import { sendReportEmail } from "../email/send";

/**
 * Orchestrates report delivery after approval:
 *   1. Loads the full report bundle
 *   2. Renders the PDF (server-side, @react-pdf/renderer)
 *   3. Uploads PDF to Convex storage
 *   4. Mints portal tokens for each default recipient
 *   5. Marks the report as delivered
 *
 * Email delivery is deferred — when a Resend API key is configured,
 * step 4.5 will send emails with the PDF attached and a portal link.
 * For now, the portal link is the primary delivery mechanism.
 */
export const deliver = internalAction({
  args: { reportId: v.id("reports") },
  handler: async (
    ctx,
    { reportId },
  ): Promise<{
    pdfStorageId: Id<"_storage">;
    deliveredTo: number;
    portalTokens: string[];
  }> => {
    // 1. Load everything in one internal query.
    const bundle = await ctx.runQuery(
      internal.reports.internal.loadForDelivery,
      { reportId },
    );

    if (bundle.report.status !== "approved") {
      throw new ConvexError({
        code: "WRONG_STATUS",
        got: bundle.report.status,
      });
    }

    // 2. Render PDF.
    const pdfBundle: DeliveryBundle = {
      org: bundle.org,
      project: bundle.project,
      report: bundle.report,
      creatorName: bundle.creatorName,
      detail: bundle.detail,
      cylinderSets: bundle.cylinderSets,
      densityReadings: bundle.densityReadings,
      dcpLayers: bundle.dcpLayers,
      pileLoadIncrements: bundle.pileLoadIncrements,
      approval: bundle.approval,
    };
    const pdfBytes = await renderReportPdf(pdfBundle);

    // 3. Upload PDF to storage.
    const pdfBlob = new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" });
    const pdfStorageId = await ctx.storage.store(pdfBlob);

    // 4. Mint portal tokens.
    const tokens: {
      contactId: Id<"clientContacts">;
      tokenId: Id<"portalTokens">;
      token: string;
    }[] = await ctx.runMutation(
      internal.portal.mutations.mintTokensForDelivery,
      { reportId, pdfStorageId },
    );

    // 4.5. Send emails (best-effort — skip if no API key).
    const hasResendKey = !!process.env.RESEND_API_KEY;
    if (hasResendKey && tokens.length > 0) {
      const siteUrl = process.env.CONVEX_SITE_URL ?? process.env.SITE_URL ?? "";

      for (const t of tokens) {
        const contact = await ctx.runQuery(
          internal.portal.internal.getContact,
          { contactId: t.contactId },
        );
        if (!contact?.email) continue;

        const portalUrl = `${siteUrl}/r/${t.token}`;
        try {
          await sendReportEmail({
            to: contact.email,
            contactName: contact.fullName,
            reportNumber: bundle.report.number,
            projectName: bundle.project.name,
            orgName: bundle.org.displayName,
            portalUrl,
            pdfBytes,
          });
          await ctx.runMutation(internal.reports.internal.updateDeliveryStatus, {
            reportId,
            portalTokenId: t.tokenId,
            status: "sent",
          });
          await ctx.runMutation(internal.reports.internal.logEmailAuditEvent, {
            reportId,
            event: "email_sent",
            metadata: contact.email,
          });
        } catch (err: any) {
          console.error(`Email to ${contact.email} failed:`, err.message);
          await ctx.runMutation(internal.reports.internal.updateDeliveryStatus, {
            reportId,
            portalTokenId: t.tokenId,
            status: "failed",
            lastError: err.message ?? "Unknown error",
          });
          await ctx.runMutation(internal.reports.internal.logEmailAuditEvent, {
            reportId,
            event: "email_failed",
            metadata: `${contact.email}: ${err.message ?? "Unknown error"}`,
          });
        }
      }
    }

    // 5. Mark delivered.
    await ctx.runMutation(internal.reports.internal.markDelivered, {
      reportId,
      pdfStorageId,
    });

    return {
      pdfStorageId,
      deliveredTo: tokens.length,
      portalTokens: tokens.map((t) => t.token),
    };
  },
});
