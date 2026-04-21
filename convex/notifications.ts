"use node";
/**
 * Web-push sender. Node action so we can use the `web-push` npm package,
 * which signs VAPID payloads and POSTs to each browser push service.
 *
 * Env vars (set in Convex dashboard → Settings → Environment Variables):
 *   - VAPID_PUBLIC_KEY   — public half, also exposed to the client as VITE_VAPID_PUBLIC_KEY
 *   - VAPID_PRIVATE_KEY  — private half, server-only
 *   - VAPID_SUBJECT      — e.g. "mailto:support@yourdomain.com"
 *
 * If any of those are unset the action no-ops silently — safe to wire into
 * mutations before keys are configured.
 *
 * Generate a keypair with: `npx web-push generate-vapid-keys` (one-time).
 */
import { v } from "convex/values";
import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/**
 * Send a notification to every active subscription for a user. Mutations
 * should schedule this via `ctx.scheduler.runAfter(0, internal.notifications.sendToUser, {...})`.
 */
export const sendToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ sent: number; gone: number }> => {
    if (!configureVapid()) return { sent: 0, gone: 0 };

    const subs: Array<{
      _id: Id<"pushSubscriptions">;
      endpoint: string;
      p256dhKey: string;
      authKey: string;
    }> = await ctx.runQuery(internal.pushSubscriptions.listActiveForUser, {
      userId: args.userId,
    });

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url,
      tag: args.tag,
    });

    let sent = 0;
    let gone = 0;

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dhKey, auth: s.authKey },
            },
            payload,
          );
          sent++;
        } catch (err) {
          // 404 = endpoint gone, 410 = unregistered. Either way, disable it.
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await ctx.runMutation(internal.pushSubscriptions.markDisabled, {
              subscriptionId: s._id,
            });
            gone++;
          }
          // Other errors (4xx/5xx from push server, network) — swallow.
        }
      }),
    );

    return { sent, gone };
  },
});
