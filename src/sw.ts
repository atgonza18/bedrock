/// <reference lib="webworker" />
/**
 * Custom service worker.
 *
 * Two jobs:
 *   1. Precache the app shell so the PWA opens offline (Workbox does this
 *      via the `__WB_MANIFEST` array injected at build time).
 *   2. Handle incoming web-push events: show a notification, and route the
 *      user to the relevant page when they tap it.
 *
 * `vite-plugin-pwa` in `injectManifest` mode bundles this file as-is.
 */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

// --- Precache app shell -----------------------------------------------------
precacheAndRoute(self.__WB_MANIFEST ?? []);
cleanupOutdatedCaches();

// SPA navigations: serve cached index.html when offline, fresh when online.
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: "navigation" }), {
    // Don't intercept Convex / API paths — those must hit the network directly.
    denylist: [/^\/api/, /\/_convex\//],
  }),
);

// --- Update plumbing --------------------------------------------------------
self.addEventListener("message", (event) => {
  if ((event.data as { type?: string })?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

// --- Push notifications -----------------------------------------------------
type PushPayload = {
  title: string;
  body?: string;
  /** Path to navigate to on notification click, e.g. "/app/reports/abc". */
  url?: string;
  /** Group ID — newer notifications with the same tag replace the old one. */
  tag?: string;
  /** Custom badge / icon overrides (default to the app icon). */
  icon?: string;
  badge?: string;
};

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data: PushPayload;
  try {
    data = event.data.json() as PushPayload;
  } catch {
    data = { title: "Bedrock", body: event.data.text() };
  }
  const title = data.title || "Bedrock";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body,
      icon: data.icon || "/bedrock-icon-192.png",
      badge: data.badge || "/bedrock-icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? "/app";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        if (client.url.includes(url)) {
          await client.focus();
          return;
        }
      }
      // Fall back: open a new window with the target URL.
      await self.clients.openWindow(url);
    })(),
  );
});
