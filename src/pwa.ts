/**
 * PWA / service-worker registration.
 *
 * `registerSW` comes from `vite-plugin-pwa`'s virtual module. In dev the
 * plugin is disabled (see `devOptions.enabled` in vite.config.ts), so the
 * import resolves to a no-op shim. In production it registers a service
 * worker that precaches the app shell and static assets.
 *
 * When a new version is available we toast the user with a one-tap
 * "Update" action — avoids silently breaking a user mid-form.
 */
import { toast } from "sonner";

export async function initPwa() {
  if (typeof window === "undefined") return;
  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
      immediate: true,
      onNeedRefresh() {
        toast.message("Update available", {
          description: "A new version of Bedrock is ready.",
          action: {
            label: "Reload",
            onClick: () => window.location.reload(),
          },
          duration: Infinity,
        });
      },
      onOfflineReady() {
        // First-time precache complete — the app now works offline.
        // Keep this quiet; we don't need to celebrate every install.
      },
    });
  } catch {
    // No SW in dev or when the module isn't available. Silent.
  }
}
