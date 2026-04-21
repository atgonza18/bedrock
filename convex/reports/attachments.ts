import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireInternal, requireMember, orgScoped, requireOwnership } from "../lib/auth";
import { attachmentParentKind } from "../schema";

/** Returns a signed upload URL the client can PUT a file to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireMember(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Records an uploaded file as an attachment on a report (or other parent). */
export const createAttachment = mutation({
  args: {
    parentKind: attachmentParentKind,
    parentId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    caption: v.optional(v.string()),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
    gpsAccuracyM: v.optional(v.number()),
    gpsCapturedAt: v.optional(v.number()),
    gpsSource: v.optional(
      v.union(v.literal("device"), v.literal("exif"), v.literal("manual")),
    ),
  },
  handler: async (ctx, args) => {
    const member = await requireInternal(ctx);
    const { org, userId } = member;

    // If the parent is a report, verify org ownership + report ownership.
    if (args.parentKind === "report") {
      const report = orgScoped(
        org._id,
        await ctx.db.get("reports", args.parentId as any),
      );
      requireOwnership(member, report);
    }

    return await ctx.db.insert("attachments", {
      orgId: org._id,
      parentKind: args.parentKind,
      parentId: args.parentId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      caption: args.caption,
      uploadedByUserId: userId,
      gpsLat: args.gpsLat,
      gpsLng: args.gpsLng,
      gpsAccuracyM: args.gpsAccuracyM,
      gpsCapturedAt: args.gpsCapturedAt,
      gpsSource: args.gpsSource,
    });
  },
});

export const removeAttachment = mutation({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, { attachmentId }) => {
    const member = await requireInternal(ctx);
    const { org } = member;
    const att = orgScoped(
      org._id,
      await ctx.db.get("attachments", attachmentId),
    );
    if (att.parentKind === "report") {
      const report = await ctx.db.get("reports", att.parentId as any);
      if (report) requireOwnership(member, report);
    }
    await ctx.storage.delete(att.storageId);
    await ctx.db.delete("attachments", attachmentId);
  },
});
