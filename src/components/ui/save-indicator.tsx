import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Check, CircleDashed, CloudOff, TriangleAlert } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "error" | "queued-offline";

function subscribeTick(cb: () => void) {
  const id = setInterval(cb, 15_000);
  return () => clearInterval(id);
}
const getNow = () => Date.now();

/**
 * Compact save-state pill for auto-saving forms.
 * Monochrome, no gradients — the check glyph picks up a single accent.
 */
export function SaveIndicator({
  state,
  savedAt,
  className,
}: {
  state: SaveState;
  savedAt?: number;
  className?: string;
}) {
  const now = useSyncExternalStore(subscribeTick, getNow, getNow);

  if (state === "idle" && !savedAt) return null;

  const label = (() => {
    if (state === "queued-offline") return "Offline — will sync";
    if (state === "saving") return "Saving…";
    if (state === "error") return "Save failed — retrying";
    if (!savedAt) return "Saved";
    const diff = now - savedAt;
    if (diff < 5_000) return "Saved";
    if (diff < 60_000) return "Saved just now";
    const mins = Math.floor(diff / 60_000);
    return `Saved ${mins}m ago`;
  })();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums",
        state === "error"
          ? "border-destructive/40 text-destructive"
          : state === "queued-offline"
            ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
            : "border-border text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      {state === "saving" ? (
        <CircleDashed className="size-3 animate-spin" strokeWidth={2} aria-hidden />
      ) : state === "error" ? (
        <TriangleAlert className="size-3" strokeWidth={2} aria-hidden />
      ) : state === "queued-offline" ? (
        <CloudOff className="size-3" strokeWidth={2} aria-hidden />
      ) : (
        <Check
          className="size-3 text-emerald-600 dark:text-emerald-500"
          strokeWidth={2.5}
          aria-hidden
        />
      )}
      <span>{label}</span>
    </div>
  );
}
