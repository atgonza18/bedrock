import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // URL-safe base64
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Mints one portal token per default recipient on the report's project.
 * Called from the deliver action.
 */
export const mintTokensForDelivery = internalMutation({
  args: {
    reportId: v.id("reports"),
    pdfStorageId: v.id("_storage"),
  },
  handler: async (ctx, { reportId, pdfStorageId }) => {
    const report = await ctx.db.get("reports", reportId);
    if (!report) throw new Error("Report not found");

    const project = await ctx.db.get("projects", report.projectId);
    if (!project) throw new Error("Project not found");

    const now = Date.now();
    const tokens: {
      contactId: Id<"clientContacts">;
      tokenId: Id<"portalTokens">;
      token: string;
    }[] = [];

    for (const contactId of project.defaultRecipientContactIds) {
      const contact = await ctx.db.get("clientContacts", contactId);
      if (!contact || !contact.isActive) continue;

      const token = generateToken();
      const tokenId = await ctx.db.insert("portalTokens", {
        orgId: report.orgId,
        reportId,
        clientContactId: contactId,
        token,
        expiresAt: now + TOKEN_TTL_MS,
        accessCount: 0,
      });

      // Create delivery record
      await ctx.db.insert("reportDeliveries", {
        orgId: report.orgId,
        reportId,
        clientContactId: contactId,
        portalTokenId: tokenId,
        pdfStorageId,
        status: "pending",
      });

      tokens.push({ contactId, tokenId, token });
    }

    return tokens;
  },
});

/** Track portal access (called from the portal frontend on page load). */
export const trackAccess = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query("portalTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!row) return;
    if (row.expiresAt < Date.now()) return;
    if (row.revokedAt) return;

    const now = Date.now();
    await ctx.db.patch("portalTokens", row._id, {
      lastAccessedAt: now,
      firstAccessedAt: row.firstAccessedAt ?? now,
      accessCount: row.accessCount + 1,
    });
  },
});
