/**
 * Web-push subscription registry.
 *
 * The full notification pipeline has two halves:
 *
 *   1. Client: subscribes via the service worker (`PushManager.subscribe`)
 *      and POSTs the endpoint + keys here. On logout or opt-out we call
 *      `unregister` so we stop sending to that device.
 *
 *   2. Server: a Convex node action (not in this file) reads VAPID keys
 *      from env, signs payloads, and POSTs each active subscription using
 *      the `web-push` npm package. Call it via `ctx.scheduler.runAfter(0, …)`
 *      from any mutation that wants to notify a user (e.g. when a report
 *      moves to review).
 *
 * Storage is minimal: one row per (user, endpoint). We upsert on endpoint so
 * reinstalling the app doesn't duplicate rows. `disabledAt` marks 404/410
 * responses ("endpoint gone") so we don't retry them.
 */
import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { requireInternal } from "./lib/auth";

/** Upsert a subscription for the current user + endpoint. */
export const register = mutation({
  args: {
    endpoint: v.string(),
    p256dhKey: v.string(),
    authKey: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org, userId } = await requireInternal(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId,
        orgId: org._id,
        p256dhKey: args.p256dhKey,
        authKey: args.authKey,
        userAgent: args.userAgent,
        lastUsedAt: now,
        disabledAt: undefined,
      });
      return existing._id;
    }
    return await ctx.db.insert("pushSubscriptions", {
      userId,
      orgId: org._id,
      endpoint: args.endpoint,
      p256dhKey: args.p256dhKey,
      authKey: args.authKey,
      userAgent: args.userAgent,
      createdAt: now,
    });
  },
});

/** Remove a subscription by endpoint (for explicit opt-out). */
export const unregister = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const { userId } = await requireInternal(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing && existing.userId === userId) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Count active subscriptions for the current user — powers the settings UI. */
export const countMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireInternal(ctx);
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return subs.filter((s) => !s.disabledAt).length;
  },
});

/** Internal: fetch active subscriptions for a user. Called by the push action. */
export const listActiveForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return subs.filter((s) => !s.disabledAt);
  },
});

/** Internal: mark an endpoint as gone (push server returned 404/410). */
export const markDisabled = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    await ctx.db.patch(subscriptionId, { disabledAt: Date.now() });
  },
});
