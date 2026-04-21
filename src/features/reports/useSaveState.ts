import { useCallback, useEffect, useState } from "react";
import type { SaveState } from "@/components/ui/save-indicator";

/**
 * Tracks the state of debounced auto-save mutations. Wrap any save promise
 * with `track(...)` — the returned state/savedAt can be fed into
 * <SaveIndicator /> for user-visible save feedback.
 *
 * Also watches `navigator.onLine`: when offline, any in-flight or future
 * `track()` calls surface as "queued-offline" so the user sees that their
 * edits are safe locally but not yet synced. When the browser reports
 * online again, the state falls back to the last real save status.
 */
export function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const track = useCallback(<T,>(promise: Promise<T>): Promise<T> => {
    setState("saving");
    return promise
      .then((value) => {
        setState("saved");
        setSavedAt(Date.now());
        return value;
      })
      .catch((err) => {
        setState("error");
        throw err;
      });
  }, []);

  // When offline, present the offline pill regardless of the underlying
  // mutation state. The real state is preserved and restored on reconnect.
  const visibleState: SaveState = !online ? "queued-offline" : state;

  return { state: visibleState, savedAt, track };
}
