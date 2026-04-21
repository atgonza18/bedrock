/**
 * Client-side helpers for web-push subscription.
 *
 * The backend exposes `pushSubscriptions.register` / `.unregister` — this
 * module handles the browser side: checking support, asking permission,
 * subscribing via the SW's PushManager, and converting the result into a
 * JSON-safe payload Convex can store.
 *
 * VAPID public key is read from `VITE_VAPID_PUBLIC_KEY`. Generate a pair
 * with `npx web-push generate-vapid-keys` (or any server-side tool) and
 * store the private key in Convex env as `VAPID_PRIVATE_KEY`, the public
 * key in the frontend env.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Allocate a fresh ArrayBuffer explicitly so the resulting Uint8Array is
  // typed as Uint8Array<ArrayBuffer> (not SharedArrayBuffer), which is what
  // PushManager.subscribe's applicationServerKey expects.
  const buf = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

export type SerializedSubscription = {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
};

export async function subscribePush(): Promise<SerializedSubscription | null> {
  if (!isPushSupported()) return null;
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey) {
    console.warn(
      "[push] VITE_VAPID_PUBLIC_KEY is not set — can't subscribe to push.",
    );
    return null;
  }
  const perm = await getPushPermission();
  if (perm !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = sub.toJSON() as {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, p256dhKey: p256dh, authKey: auth };
}

export async function unsubscribePush(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
