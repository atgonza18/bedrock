import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

/**
 * Always-on thin banner that appears when the device loses connectivity.
 * Critical for field techs: auto-save depends on a live connection and
 * silent save failures are the nightmare scenario.
 */
export function ConnectionBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium tracking-wide">
        <WifiOff className="size-3.5" strokeWidth={2} />
        <span>No connection — changes will save when you&rsquo;re back online</span>
      </div>
    </div>
  );
}
